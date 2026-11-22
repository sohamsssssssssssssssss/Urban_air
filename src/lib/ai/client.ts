import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "../env";

let client: GoogleGenAI | null | undefined;

/**
 * Lazily created Gemini client, or null when no key is configured (rule-based mode).
 */
export function getGemini(): GoogleGenAI | null {
  if (client === undefined) client = env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;
  return client;
}
