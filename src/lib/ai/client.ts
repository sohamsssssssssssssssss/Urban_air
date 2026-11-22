import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_VERSION, GEMINI_MODELS } from "../constants";
import { env } from "../env";

let client: GoogleGenAI | null | undefined;

/**
 * Lazily created Gemini client, or null when no key is configured (rule-based mode).
 * Pinned to v1beta: JSON mode with responseJsonSchema is rejected on v1 (verified against the live API).
 */
export function getGemini(): GoogleGenAI | null {
  if (client === undefined) {
    client = env.GEMINI_API_KEY
      ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { apiVersion: GEMINI_API_VERSION, retryOptions: { attempts: 1 } } })
      : null;
  }
  return client;
}

/** Models to try, best first. `GEMINI_MODEL` (if set) goes first; duplicates are dropped. */
export function modelChain(): string[] {
  return [...new Set([env.GEMINI_MODEL, ...GEMINI_MODELS].filter((m): m is string => Boolean(m)))];
}

/** `thinkingBudget: 0` (fast structured output) is a 2.5-family option; Gemini 3 models reject it with HTTP 400. */
export function thinkingFor(model: string): { thinkingConfig?: { thinkingBudget: number } } {
  return model.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {};
}
