import "server-only";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_VERSION } from "../constants";
import { env } from "../env";

let client: GoogleGenAI | null | undefined;

/**
 * Lazily created Gemini client, or null when no key is configured (rule-based mode).
 * Pinned to v1beta: JSON mode with responseJsonSchema is rejected on v1 (verified against the live API).
 */
export function getGemini(): GoogleGenAI | null {
  if (client === undefined) client = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { apiVersion: GEMINI_API_VERSION } }) : null;
  return client;
}
