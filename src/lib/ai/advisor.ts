import "server-only";
import { createHash } from "node:crypto";
import type { AQSnapshot } from "../aq/types";
import { createTtlCache } from "../cache";
import { ADVICE_AI_TIMEOUT_MS, ADVICE_CACHE_TTL_MS, ADVICE_MAX_OUTPUT_TOKENS, AI_RETRIES, AI_TEMPERATURE, GEMINI_MODEL } from "../constants";
import { env } from "../env";
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

const cache = createTtlCache<{ context: string; advice: Advice | null }>(ADVICE_CACHE_TTL_MS);

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

async function generateWithGemini(s: AQSnapshot, facts: Fact[], context: string, language: Language): Promise<Advice | null> {
  const ai = getGemini();
  if (!ai) return null;
  const deadline = AbortSignal.timeout(ADVICE_AI_TIMEOUT_MS);
  for (let attempt = 0; attempt <= AI_RETRIES && !deadline.aborted; attempt++) {
    const res = await ai.models.generateContent({
      model: env.GEMINI_MODEL || GEMINI_MODEL,
      contents: `CONTEXT: ${context}`,
      config: {
        systemInstruction: adviceSystemPrompt(language),
        responseMimeType: "application/json",
        responseJsonSchema: modelAdviceJsonSchema,
        maxOutputTokens: ADVICE_MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: deadline,
      },
    }).catch(() => {
      console.warn("Gemini advice request failed");
      return null;
    });
    if (!res) return null;
    try {
      const parsed = ModelAdviceSchema.safeParse(JSON.parse(res.text ?? ""));
      const merged = parsed.success ? mergeModelAdvice(parsed.data, facts, s, context, language) : null;
      if (merged) return merged;
      console.warn(`Gemini advice rejected (attempt ${attempt + 1})`);
    } catch {
      console.warn(`Gemini advice returned invalid JSON (attempt ${attempt + 1})`);
    }
  }
  return null;
}

/**
 * Personalised advice for a live snapshot.
 * Cache the model attempt for 30 minutes per station, NAQI category, household and language.
 * When grounded details change within that band, rebuild advice from the current facts.
 */
export async function getAdvice(s: AQSnapshot, profile: UserProfile, language: Language, hasMetro: boolean): Promise<AdviceResult> {
  const hash = createHash("sha256").update(JSON.stringify([s.station.id, s.category, profile, language, hasMetro])).digest("hex");
  const facts = buildFacts(s, profile, hasMetro, language);
  const context = buildContext(s, profile, facts);
  const cached = await cache.getOrLoad(hash, async () => ({ context, advice: await generateWithGemini(s, facts, context, language) }));
  if (cached.advice && cached.context === context) return { advice: cached.advice, generatedBy: "gemini" };
  return { advice: ruleBasedAdvice(s, facts, language), generatedBy: "rules" };
}
