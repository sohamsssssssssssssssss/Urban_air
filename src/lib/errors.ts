/** Machine-readable error codes returned by the API. */
export type ErrorCode = "BAD_REQUEST" | "RATE_LIMITED" | "AQ_UNAVAILABLE" | "AI_UNAVAILABLE" | "PLACE_NOT_FOUND" | "GEOCODE_UNAVAILABLE" | "ROUTE_UNAVAILABLE" | "FORECAST_UNAVAILABLE" | "INTERNAL";

/** Base class for expected, user-safe errors. The message is safe to show to clients. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Request failed schema validation. */
export class ValidationError extends AppError {
  constructor(message = "Invalid request.") {
    super("BAD_REQUEST", 400, message);
  }
}

/** Client exceeded its token bucket. */
export class RateLimitError extends AppError {
  constructor(readonly retryAfterSec: number) {
    super("RATE_LIMITED", 429, "Too many requests. Please slow down.");
  }
}

/** No live air-quality source answered. We never substitute guessed values. */
export class AQUnavailableError extends AppError {
  constructor(message = "Live air-quality data is unavailable for this location right now.") {
    super("AQ_UNAVAILABLE", 503, message);
  }
}

/** The AI model is not configured or failed. */
export class AIUnavailableError extends AppError {
  constructor(message = "The AI assistant is unavailable right now.") {
    super("AI_UNAVAILABLE", 503, message);
  }
}

/** A place name matched nothing in Nominatim. */
export class PlaceNotFoundError extends AppError {
  constructor(message = "We couldn't find that place. Try a more specific name or add the city.") {
    super("PLACE_NOT_FOUND", 404, message);
  }
}

/** Nominatim (place search) failed or timed out. */
export class GeocodeUnavailableError extends AppError {
  constructor(message = "Place search is unavailable right now. Please try again shortly.") {
    super("GEOCODE_UNAVAILABLE", 503, message);
  }
}

/** OSRM returned no route for any mode, or failed. */
export class RouteUnavailableError extends AppError {
  constructor(message = "No route could be found between these places right now.") {
    super("ROUTE_UNAVAILABLE", 503, message);
  }
}

/** The air-quality forecast service (Open-Meteo) failed or timed out. */
export class ForecastUnavailableError extends AppError {
  constructor(message = "The air-quality forecast is unavailable right now. Please try again shortly.") {
    super("FORECAST_UNAVAILABLE", 503, message);
  }
}

/** Upstream HTTP failure (internal; callers fall back to the next source). */
export class UpstreamError extends Error {
  constructor(
    readonly source: string,
    message: string,
  ) {
    super(`${source}: ${message}`);
    this.name = "UpstreamError";
  }
}

/**
 * Converts any thrown value into a JSON Response without leaking internals.
 * @param err - anything that was thrown
 * @returns a typed `{ error: { code, message } }` response
 */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    const headers: Record<string, string> = {};
    if (err instanceof RateLimitError) headers["Retry-After"] = String(err.retryAfterSec);
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status, headers });
  }
  console.error("Unhandled error", err instanceof Error ? err.message : err);
  return Response.json({ error: { code: "INTERNAL", message: "Something went wrong." } }, { status: 500 });
}
