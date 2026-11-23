import { z } from "zod";
import { CHAT_MAX_CHARS, CHAT_MAX_HISTORY, CHAT_MAX_TURN_CHARS } from "./constants";
import { TONES } from "./impact/copy/types";
import { LanguageSchema, LocationSchema, ProfileSchema } from "./profile";

const BaseRequestSchema = z.object({ location: LocationSchema, profile: ProfileSchema, language: LanguageSchema }).strict();

/** POST /api/advice body. `tone: "kids"` asks for simple wording on routine and indoor tips. */
export const AdviceRequestSchema = BaseRequestSchema.extend({ tone: z.enum(TONES).default("standard") }).strict();
export type AdviceRequest = z.infer<typeof AdviceRequestSchema>;

const ChatTurnSchema = z.object({ role: z.enum(["user", "model"]), text: z.string().max(CHAT_MAX_TURN_CHARS) }).strict();
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

/** POST /api/chat body. Message length is capped to bound cost and injection surface. */
export const ChatRequestSchema = BaseRequestSchema.extend({
  message: z.string().trim().min(1).max(CHAT_MAX_CHARS),
  history: z.array(ChatTurnSchema).max(CHAT_MAX_HISTORY),
}).strict();
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
