import "server-only";
import type { AQSnapshot } from "../aq/types";
import { AI_TEMPERATURE, AI_TIMEOUT_MS, AQI_SEVERE, CHAT_MAX_OUTPUT_TOKENS } from "../constants";
import { UI } from "../i18n";
import { buildFacts } from "../impact/facts";
import type { Language, UserProfile } from "../profile";
import type { ChatTurn } from "../requests";
import { getGemini, modelChain, thinkingFor } from "./client";
import { classifyAiError, shouldTryNextModel, type AiFailureReason } from "./failure";
import { bestOutdoorWindow, ruleSummary } from "./fallback";
import { buildContext, chatSystemPrompt, wrapUserMessage } from "./prompts";
import type { Fact } from "./schema";

export interface ChatInput {
  snapshot: AQSnapshot;
  profile: UserProfile;
  hasMetro: boolean;
  language: Language;
  message: string;
  history: ChatTurn[];
}

const INTENTS = [
  [/\b(masks?|n95|ffp2|respirators?)\b|मास्क/i, ["n95_mask", "outdoor_timing"]],
  [/\b(plants?|houseplants?)\b|पौध/i, ["plants_reality", "purifier"]],
  [/\b(purifiers?|hepa|filters?)\b|प्यूरिफायर|फ़िल्टर|फिल्टर/i, ["purifier"]],
  [/\b(commut\w*|travel|transit|traffic|metro|bus|carpool)\b|आना-जाना|सफ़र|सफर|मेट्रो|बस/i, ["commute_exposure", "outdoor_timing"]],
  [/\b(exercise|running|run|sports?|workouts?|play)\b|व्यायाम|कसरत|खेल|दौड़/i, ["exercise_indoors", "outdoor_timing"]],
  [/\b(outdoors?|outside|park|walks?)\b|बाहर|पार्क|टहल/i, ["outdoor_timing", "exercise_indoors"]],
  [/\b(kids?|children|child|elderly|(?:grand)?parents?|seniors?|older adults?)\b|बच्च|बुज़ुर्ग|बुजुर्ग/i, ["exercise_indoors", "purifier"]],
  [/\b(indoors?|bedroom|windows?|ventilat\w*|home)\b|घर|अंदर|खिड़की/i, ["purifier", "ventilation_timing"]],
] as const;
const EXPLANATION = /\b(why|impact|effect|how much)\b|क्यों|असर|कितना/i;

function ruleReply({ snapshot, language, message, history }: ChatInput, facts: Fact[], reason: AiFailureReason): string {
  const previous = history.findLast((turn) => turn.role === "user")?.text ?? "";
  const ids = INTENTS.find(([pattern]) => pattern.test(message))?.[1]
    ?? (EXPLANATION.test(message) ? INTENTS.find(([pattern]) => pattern.test(previous))?.[1] : undefined)
    ?? ["outdoor_timing", "purifier"];
  const severe = snapshot.aqi >= AQI_SEVERE;
  const guidance = ids.flatMap((id) => {
    const fact = facts.find((entry) => entry.id === id);
    if (!fact) return [];
    const action = severe && id === "outdoor_timing" ? bestOutdoorWindow(snapshot, language) : fact.action;
    return [`${action} ${fact.why} ${fact.impact}`];
  });
  const notice = UI[language].chat.fallback(UI[language].plan.aiReasons[reason]);
  return [notice, ruleSummary(snapshot, language), ...guidance].join("\n\n");
}

/**
 * Streams a grounded follow-up answer as UTF-8 plain text.
 * The snapshot is fetched server-side, never taken from the client.
 */
export async function streamChat(input: ChatInput): Promise<ReadableStream<Uint8Array>> {
  const { snapshot, profile, hasMetro, language, message, history } = input;
  const ai = getGemini();
  const facts = buildFacts(snapshot, profile, hasMetro, language);
  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.role === "user" ? wrapUserMessage(t.text) : t.text }] })),
    { role: "user", parts: [{ text: wrapUserMessage(message) }] },
  ];

  const encoder = new TextEncoder();
  async function* reply() {
    let sent = false;
    let reason: AiFailureReason = ai ? "other" : "auth";
    const config = {
      systemInstruction: chatSystemPrompt(buildContext(snapshot, profile, facts), language),
      maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      temperature: AI_TEMPERATURE,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    };
    for (const model of ai ? modelChain() : []) {
      try {
        const chunks = await ai!.models.generateContentStream({ model, contents, config: { ...config, ...thinkingFor(model) } });
        for await (const chunk of chunks) {
          if (!chunk.text || (!sent && !chunk.text.trim())) continue;
          sent = true;
          yield encoder.encode(chunk.text);
        }
        if (sent) return;
        reason = "other"; // empty answer
      } catch (err) {
        reason = classifyAiError(err);
      }
      console.warn(`AI chat failed reason=${reason} model=${model}`);
      if (sent || !shouldTryNextModel(reason)) break; // never switch models after text was streamed
    }
    yield encoder.encode((sent ? "\n\n" : "") + ruleReply(input, facts, reason));
  }
  const iterator = reply();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = await iterator.next();
      if (chunk.done) controller.close();
      else controller.enqueue(chunk.value);
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}
