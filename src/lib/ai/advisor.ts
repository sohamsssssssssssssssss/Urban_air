import "server-only";
import { createHash } from "node:crypto";
import type { AQSnapshot } from "../aq/types";
import { createTtlCache } from "../cache";
import { ADVICE_CACHE_TTL_MS, ADVICE_MAX_OUTPUT_TOKENS, AI_RETRIES, AI_TEMPERATURE, AI_TIMEOUT_MS, GEMINI_MODEL } from "../constants";
import { buildFacts } from "../impact/facts";
import type { Language, UserProfile } from "../profile";
import { getGemini } from "./client";
import { bestOutdoorWindow, ruleBasedAdvice } from "./fallback";
import { ungroundedNumbers } from "./grounding";
import { adviceSystemPrompt, buildContext } from "./prompts";
import { ModelAdviceSchema, SECTIONS, modelAdviceJsonSchema, type Advice, type Fact, type ModelAdvice } from "./schema";

export interface AdviceResult {
  advice: Advice;
  generatedBy: "gemini" | "rules";
}

const cache = createTtlCache<AdviceResult>(ADVICE_CACHE_TTL_MS);

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

async function generateWithGemini(s: AQSnapshot, profile: UserProfile, facts: Fact[], language: Language): Promise<Advice | null> {
  const ai = getGemini();
  if (!ai) return null;
  const context = buildContext(s, profile, facts);
  for (let attempt = 0; attempt <= AI_RETRIES; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `CONTEXT: ${context}`,
        config: {
          systemInstruction: adviceSystemPrompt(language),
          responseMimeType: "application/json",
          responseJsonSchema: modelAdviceJsonSchema,
          maxOutputTokens: ADVICE_MAX_OUTPUT_TOKENS,
          temperature: AI_TEMPERATURE,
          thinkingConfig: { thinkingBudget: 0 },
          abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
        },
      });
      const parsed = ModelAdviceSchema.safeParse(JSON.parse(res.text ?? ""));
      const merged = parsed.success ? mergeModelAdvice(parsed.data, facts, s, context, language) : null;
      if (merged) return merged;
      console.warn(`Gemini advice rejected (attempt ${attempt + 1})`);
    } catch (err) {
      console.warn(`Gemini advice failed (attempt ${attempt + 1})`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/**
 * Personalised advice for a live snapshot. Gemini rephrases and prioritises pre-computed facts;
 * if it is unavailable or fails validation twice, rule-based advice is returned instead.
 * Cached 15 minutes per station reading + profile + language.
 */
export function getAdvice(s: AQSnapshot, profile: UserProfile, language: Language, hasMetro: boolean): Promise<AdviceResult> {
  const hash = createHash("sha256").update(JSON.stringify([s.station.id, s.measuredAt, profile, language, hasMetro])).digest("hex");
  return cache.getOrLoad(hash, async () => {
    const facts = buildFacts(s, profile, hasMetro, language);
    const ai = await generateWithGemini(s, profile, facts, language);
    return ai ? { advice: ai, generatedBy: "gemini" } : { advice: ruleBasedAdvice(s, facts, language), generatedBy: "rules" };
  });
}
