import { RATE_LIMIT_CAPACITY, RATE_LIMIT_MAX_KEYS, RATE_LIMIT_REFILL_PER_SEC } from "./constants";

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until one token is available (0 when allowed). */
  retryAfterSec: number;
}

export interface RateLimiterOptions {
  capacity?: number;
  refillPerSec?: number;
  maxKeys?: number;
  now?: () => number;
}

/**
 * Token-bucket rate limiter keyed by client id (IP).
 * shortcut: in-process state, so limits are per instance. Use shared storage when limits must span instances.
 * @returns `take(key)` which consumes one token if available
 */
export function createRateLimiter({
  capacity = RATE_LIMIT_CAPACITY,
  refillPerSec = RATE_LIMIT_REFILL_PER_SEC,
  maxKeys = RATE_LIMIT_MAX_KEYS,
  now = Date.now,
}: RateLimiterOptions = {}) {
  const buckets = new Map<string, { tokens: number; updatedAt: number }>();

  return function take(key: string): RateLimitResult {
    const t = now();
    const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: t };
    const elapsedSec = (t - bucket.updatedAt) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
    bucket.updatedAt = t;

    buckets.delete(key);
    buckets.set(key, bucket);
    if (buckets.size > maxKeys) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, retryAfterSec: 0 };
    }
    return { allowed: false, retryAfterSec: Math.ceil((1 - bucket.tokens) / refillPerSec) };
  };
}

/**
 * Client IP for rate limiting. Vercel sets X-Forwarded-For to the public client IP.
 * @param headers - request headers
 */
export function clientIp(headers: Headers): string {
  const hops = headers.get("x-forwarded-for")?.split(",") ?? [];
  return hops.at(-1)?.trim() || "unknown";
}
