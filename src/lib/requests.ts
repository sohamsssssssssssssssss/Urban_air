import { z } from "zod";
import { CHAT_MAX_CHARS, CHAT_MAX_HISTORY, CHAT_MAX_TURN_CHARS } from "./constants";
import { LanguageSchema, LocationSchema, ProfileSchema } from "./profile";

/** POST /api/advice body. */
export const AdviceRequestSchema = z.object({ location: LocationSchema, profile: ProfileSchema, language: LanguageSchema }).strict();
export type AdviceRequest = z.infer<typeof AdviceRequestSchema>;

const ChatTurnSchema = z.object({ role: z.enum(["user", "model"]), text: z.string().max(CHAT_MAX_TURN_CHARS) }).strict();
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

/** POST /api/chat body. Message length is capped to bound cost and injection surface. */
export const ChatRequestSchema = AdviceRequestSchema.extend({
  message: z.string().trim().min(1).max(CHAT_MAX_CHARS),
  history: z.array(ChatTurnSchema).max(CHAT_MAX_HISTORY),
}).strict();
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
