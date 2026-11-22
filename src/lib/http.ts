import "server-only";
import type { z } from "zod";
import { MAX_BODY_CHARS } from "./constants";
import { RateLimitError, ValidationError, toErrorResponse } from "./errors";
import { clientIp, createRateLimiter } from "./rateLimit";
import { findCity, nearestCity } from "./cities";
import type { Location } from "./profile";

const limiter = createRateLimiter();

/**
 * Runs a route handler behind the per-IP rate limiter and maps every error to typed JSON.
 * @param req - incoming request
 * @param handler - route logic
 */
export async function handle(req: Request, handler: () => Promise<Response>): Promise<Response> {
  try {
    const { allowed, retryAfterSec } = limiter(clientIp(req.headers));
    if (!allowed) throw new RateLimitError(retryAfterSec);
    return await handler();
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * Reads a size-capped JSON body and validates it.
 * @throws ValidationError on oversize, malformed or invalid input (field names only, no echo of values)
 */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) throw new ValidationError("Request body too large.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ValidationError("Request body must be JSON.");
  }
  return parseInput(schema, json);
}

/** Validates arbitrary input, throwing a ValidationError listing the invalid fields. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((i) => i.path.join(".") || "body"))].join(", ");
    throw new ValidationError(`Invalid fields: ${fields}`);
  }
  return result.data;
}

/** Whether the user's (chosen or nearest) city has a metro network. */
export function hasMetro(location: Location): boolean {
  return (findCity(location.city) ?? nearestCity(location.lat, location.lon)).hasMetro;
}
