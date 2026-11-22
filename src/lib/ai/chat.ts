import "server-only";
import type { AQSnapshot } from "../aq/types";
import { AI_TEMPERATURE, AI_TIMEOUT_MS, CHAT_MAX_OUTPUT_TOKENS, GEMINI_MODEL } from "../constants";
import { AIUnavailableError } from "../errors";
import { buildFacts } from "../impact/facts";
import type { Language, UserProfile } from "../profile";
import type { ChatTurn } from "../requests";
import { getGemini } from "./client";
import { buildContext, chatSystemPrompt, wrapUserMessage } from "./prompts";

export interface ChatInput {
  snapshot: AQSnapshot;
  profile: UserProfile;
  hasMetro: boolean;
  language: Language;
  message: string;
  history: ChatTurn[];
}

const INTERRUPTED = "\n[The answer was interrupted. Please try again.]";

/**
 * Streams a grounded follow-up answer as UTF-8 plain text.
 * The snapshot is fetched server-side, never taken from the client.
 * @throws AIUnavailableError when Gemini is not configured or the request fails before streaming
 */
export async function streamChat({ snapshot, profile, hasMetro, language, message, history }: ChatInput): Promise<ReadableStream<Uint8Array>> {
  const ai = getGemini();
  if (!ai) throw new AIUnavailableError("Chat needs a Gemini API key. Rule-based advice above still applies.");

  const context = buildContext(snapshot, profile, buildFacts(snapshot, profile, hasMetro));
  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.role === "user" ? wrapUserMessage(t.text) : t.text }] })),
    { role: "user", parts: [{ text: wrapUserMessage(message) }] },
  ];

  let chunks: AsyncIterable<{ text?: string }>;
  try {
    chunks = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: chatSystemPrompt(context, language),
        maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
        temperature: AI_TEMPERATURE,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      },
    });
  } catch (err) {
    console.warn("Gemini chat failed", err instanceof Error ? err.message : err);
    throw new AIUnavailableError();
  }

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
      } catch {
        controller.enqueue(encoder.encode(INTERRUPTED));
      }
      controller.close();
    },
  });
}
