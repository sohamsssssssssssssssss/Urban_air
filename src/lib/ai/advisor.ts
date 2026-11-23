import "server-only";
import { createHash } from "node:crypto";
import type { AQSnapshot } from "../aq/types";
import { createTtlCache } from "../cache";
import { ADVICE_AI_TIMEOUT_MS, ADVICE_CACHE_TTL_MS, ADVICE_MAX_OUTPUT_TOKENS, AI_FAILURE_COOLDOWN_MS, AI_RETRIES, AI_TEMPERATURE } from "../constants";
import { buildFacts } from "../impact/facts";
import type { Language, UserProfile } from "../profile";
import { getGemini, modelChain, thinkingFor } from "./client";
import { classifyAiError, shouldTryNextModel, type AiFailureReason } from "./failure";
import { bestOutdoorWindow, ruleBasedAdvice } from "./fallback";
import { ungroundedNumbers } from "./grounding";
import { acceptRephrase, type RephraseTarget } from "./rephrase";
import { adviceSystemPrompt, buildContext } from "./prompts";
import { ModelAdviceSchema, SECTIONS, modelAdviceJsonSchema, type Advice, type Fact, type ModelAdvice } from "./schema";

export interface AdviceResult {
  advice: Advice;
  generatedBy: "gemini" | "rules";
  /** Gemini's reworded "Today in one line", present only when it passed the guard. */
  todayLine?: string;
  /** Present when `generatedBy` is "rules" because AI was tried and failed (code only, never a message). */
  fallbackReason?: AiFailureReason;
}

/** Successful model answers only; failures are remembered briefly in `failures` instead. */
const cache = createTtlCache<{ context: string; advice: Advice; todayLine?: string }>(ADVICE_CACHE_TTL_MS);
const failures = createTtlCache<AiFailureReason>(AI_FAILURE_COOLDOWN_MS);
/** Concurrent identical requests share one Gemini call. */
const inFlight = new Map<string, Promise<Attempt>>();

type Attempt = { advice: Advice; todayLine?: string } | { reason: AiFailureReason };

/**
 * Validates model output against the facts. Returns null (forcing retry/fallback) when the model
 * invents numbers, references unknown facts, or empties a section.
 */
export function mergeModelAdvice(model: ModelAdvice, facts: Fact[], s: AQSnapshot, context: string, language: Language): Advice | null {
  const byId = new Map(facts.map((f) => [f.id, f]));
  const advice: Advice = { summary: model.summary, bestOutdoorWindow: bestOutdoorWindow(s, language), routines: [], indoor: [], alternatives: [] };

  for (const section of SECTIONS) {
    const seen = new Set<string>();
    for (const item of model[section]) {
      const fact = byId.get(item.factId);
      if (!fact || fact.section !== section || seen.has(fact.id)) continue;
      seen.add(fact.id);
      // Facts are already in the target language, so the computed impact is always used verbatim.
      advice[section].push({ action: item.action, why: item.why, personalizedFor: item.personalizedFor, priority: item.priority, impact: fact.impact });
    }
    if (advice[section].length === 0 && facts.some((f) => f.section === section)) return null;
  }

  const prose = [model.summary, ...SECTIONS.flatMap((sec) => advice[sec].map((i) => `${i.action} ${i.why} ${i.personalizedFor}`))].join(" ");
  return ungroundedNumbers(prose, context).length === 0 ? advice : null;
}

async function generateWithGemini(s: AQSnapshot, facts: Fact[], context: string, language: Language, target?: RephraseTarget): Promise<Attempt> {
  const ai = getGemini();
  if (!ai) return { reason: "auth" };
  const deadline = AbortSignal.timeout(ADVICE_AI_TIMEOUT_MS);
  let reason: AiFailureReason = "other";
  for (const model of modelChain()) {
    for (let attempt = 0; attempt <= AI_RETRIES && !deadline.aborted; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: `CONTEXT: ${context}`,
          config: {
            systemInstruction: adviceSystemPrompt(language, Boolean(target)),
            responseMimeType: "application/json",
            responseJsonSchema: modelAdviceJsonSchema,
            maxOutputTokens: ADVICE_MAX_OUTPUT_TOKENS,
            temperature: AI_TEMPERATURE,
            ...thinkingFor(model),
            abortSignal: deadline,
          },
        });
        const parsed = ModelAdviceSchema.safeParse(JSON.parse(res.text ?? ""));
        const merged = parsed.success ? mergeModelAdvice(parsed.data, facts, s, context, language) : null;
        if (merged) return { advice: merged, todayLine: target && parsed.success ? acceptRephrase(parsed.data.todayLine, target, context) : undefined };
        reason = "schema"; // output failed validation or the grounding guard: retry once on this model
      } catch (err) {
        reason = err instanceof SyntaxError ? "schema" : classifyAiError(err);
        if (reason !== "schema") break; // transport/model errors will not improve on an immediate retry
      }
    }
    console.warn(`AI advice failed reason=${reason} model=${model}`);
    if (deadline.aborted) return { reason: "timeout" };
    if (!shouldTryNextModel(reason)) break;
  }
  return { reason };
}

/**
 * Personalised advice for a live snapshot.
 * A successful model answer is cached 30 minutes per station, NAQI category, household and language;
 * when grounded details change within that band, rule-based advice is rebuilt from the current facts.
 * A failed attempt is not cached beyond a short cooldown, so a transient quota error self-heals.
 */
export async function getAdvice(s: AQSnapshot, profile: UserProfile, language: Language, hasMetro: boolean, rephrase?: RephraseTarget): Promise<AdviceResult> {
  const hash = createHash("sha256").update(JSON.stringify([s.station.id, s.category, profile, language, hasMetro, rephrase?.line])).digest("hex");
  const facts = buildFacts(s, profile, hasMetro, language);
  const context = buildContext(s, profile, facts, rephrase ? { todayLine: rephrase.line } : undefined);
  const rules = (fallbackReason: AiFailureReason): AdviceResult => ({ advice: ruleBasedAdvice(s, facts, language), generatedBy: "rules", fallbackReason });

  const cached = cache.get(hash);
  // Same band but the grounded facts moved on: serve fresh rules rather than a stale AI plan or a new call.
  if (cached) return cached.context === context ? { advice: cached.advice, generatedBy: "gemini", todayLine: cached.todayLine } : rules("other");
  const cooling = failures.get(hash);
  if (cooling) return rules(cooling);

  const pending = inFlight.get(hash) ?? generateWithGemini(s, facts, context, language, rephrase).finally(() => inFlight.delete(hash));
  inFlight.set(hash, pending);
  const attempt = await pending;
  if ("advice" in attempt) {
    cache.set(hash, { context, advice: attempt.advice, todayLine: attempt.todayLine });
    return { advice: attempt.advice, generatedBy: "gemini", todayLine: attempt.todayLine };
  }
  failures.set(hash, attempt.reason);
  return rules(attempt.reason);
}
