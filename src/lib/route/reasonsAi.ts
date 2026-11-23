import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getGemini, modelChain, thinkingFor } from "../ai/client";
import { classifyAiError, shouldTryNextModel, type AiFailureReason } from "../ai/failure";
import { ungroundedNumbers } from "../ai/grounding";
import { createTtlCache } from "../cache";
import { ADVICE_CACHE_TTL_MS, AI_FAILURE_COOLDOWN_MS, AI_TEMPERATURE } from "../constants";
import type { Language } from "../i18n";
import { ROUTE_AI_TIMEOUT_MS } from "./constants";
import type { RouteCard } from "./types";

const ReasonsSchema = z.object({ reasons: z.array(z.object({ id: z.string().max(40), reason: z.string().min(1).max(220) })).max(3) });
const jsonSchema = Object.fromEntries(Object.entries(z.toJSONSchema(ReasonsSchema)).filter(([key]) => key !== "$schema"));
const LANGUAGE_NAME: Record<Language, string> = { en: "English", hi: "Hindi (Devanagari, Western digits 0-9)" };
/** Exposure is an estimate. A reason that calls it "measured" is rejected. */
const CLAIMS_MEASURED = /\bmeasured\b|मापा/i;

const cache = createTtlCache<Record<string, string>>(ADVICE_CACHE_TTL_MS);
const failures = createTtlCache<AiFailureReason>(AI_FAILURE_COOLDOWN_MS);

export interface ReasonResult {
  cards: RouteCard[];
  generatedBy: "gemini" | "computed";
  fallbackReason?: AiFailureReason;
}

class GenerationFailed extends Error {
  constructor(readonly reason: AiFailureReason) {
    super(reason);
  }
}

async function generate(context: string, ids: Set<string>, lang: Language): Promise<Record<string, string>> {
  const ai = getGemini();
  if (!ai) throw new GenerationFailed("auth");
  const deadline = AbortSignal.timeout(ROUTE_AI_TIMEOUT_MS);
  let reason: AiFailureReason = "other";
  for (const model of modelChain()) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: `CONTEXT: ${context}`,
        config: {
          systemInstruction: `You write one-line reasons for route choices in an air-quality app. Use ONLY the numbers in CONTEXT; never invent figures, places or times. Each reason is ONE sentence of at most 30 words in ${LANGUAGE_NAME[lang]}. Exposure figures are ESTIMATES: say "estimated" and never "measured". Return one reason per card id.`,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          maxOutputTokens: 1_024,
          temperature: AI_TEMPERATURE,
          ...thinkingFor(model),
          abortSignal: deadline,
        },
      });
      const parsed = ReasonsSchema.parse(JSON.parse(res.text ?? ""));
      const accepted: Record<string, string> = {};
      for (const { id, reason: text } of parsed.reasons) {
        const line = text.replace(/\s+/g, " ").trim();
        if (ids.has(id) && !CLAIMS_MEASURED.test(line) && ungroundedNumbers(line, context).length === 0) accepted[id] = line;
      }
      if (Object.keys(accepted).length > 0) return accepted;
      reason = "schema";
    } catch (err) {
      reason = err instanceof SyntaxError || err instanceof z.ZodError ? "schema" : classifyAiError(err);
    }
    console.warn(`AI route reasons failed reason=${reason} model=${model}`);
    if (!shouldTryNextModel(reason)) break;
  }
  throw new GenerationFailed(reason);
}

/**
 * Lets Gemini reword the computed one-line reasons. It receives only the computed numbers; any reason
 * with a number outside the context, or that calls the estimate "measured", is dropped and the computed
 * sentence is kept. Without Gemini (or on failure) every reason stays the computed sentence.
 */
export async function rewriteReasons(cards: RouteCard[], lang: Language): Promise<ReasonResult> {
  const context = JSON.stringify(cards.map(({ route: r, labels, reason }) => ({ id: r.id, mode: r.mode, labels, minutes: r.durationMin, km: r.distanceKm, estimatedPm25Ug: r.pm25Ug, co2Kg: r.co2Kg, computed: reason })));
  const key = createHash("sha256").update(lang + context).digest("hex");
  const cooling = failures.get(key);
  if (cooling) return { cards, generatedBy: "computed", fallbackReason: cooling };
  try {
    const reasons = await cache.getOrLoad(key, () => generate(context, new Set(cards.map((c) => c.route.id)), lang));
    return { cards: cards.map((c) => ({ ...c, reason: reasons[c.route.id] ?? c.reason })), generatedBy: "gemini" };
  } catch (err) {
    const reason = err instanceof GenerationFailed ? err.reason : "other";
    failures.set(key, reason);
    return { cards, generatedBy: "computed", fallbackReason: reason };
  }
}
