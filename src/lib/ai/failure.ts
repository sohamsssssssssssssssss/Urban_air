/** Why an AI request fell back to rules. Codes only: provider messages never reach the client. */
export const AI_FAILURE_REASONS = ["quota", "auth", "model", "schema", "timeout", "other"] as const;
export type AiFailureReason = (typeof AI_FAILURE_REASONS)[number];

/** Reasons where a different model may still work (a retired model name, or a per-model quota). */
const TRY_NEXT_MODEL: ReadonlySet<AiFailureReason> = new Set(["model", "quota"]);
export const shouldTryNextModel = (reason: AiFailureReason) => TRY_NEXT_MODEL.has(reason);

const HTTP = { badRequest: 400, unauthorized: 401, forbidden: 403, notFound: 404, tooMany: 429 } as const;

/**
 * Maps a thrown Gemini SDK / network error to a coarse reason code.
 * 404 = retired or unknown model, 429 = quota, 401/403 or "API key" = auth,
 * other 400 = request/schema rejected, abort/timeout = timeout.
 * @param err - anything thrown by `@google/genai` or fetch
 */
export function classifyAiError(err: unknown): AiFailureReason {
  const e = err as { status?: number; name?: string; message?: string } | null;
  const message = e?.message ?? "";
  if (e?.name === "AbortError" || e?.name === "TimeoutError" || /abort|timed? ?out/i.test(message)) return "timeout";
  if (e?.status === HTTP.unauthorized || e?.status === HTTP.forbidden || /api key/i.test(message)) return "auth";
  if (e?.status === HTTP.tooMany || /RESOURCE_EXHAUSTED|quota/i.test(message)) return "quota";
  if (e?.status === HTTP.notFound) return "model";
  if (e?.status === HTTP.badRequest) return "schema";
  return "other";
}
