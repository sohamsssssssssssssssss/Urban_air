import "server-only";
import type { z } from "zod";
import { FETCH_TIMEOUT_MS } from "./constants";
import { UpstreamError } from "./errors";

/**
 * GETs JSON with a hard timeout and validates it against a Zod schema,
 * so malformed upstream payloads never propagate into the app.
 * @param source - label used in error messages
 * @param url - absolute URL
 * @param schema - expected response shape
 * @param headers - request headers (API keys)
 */
export async function fetchJson<S extends z.ZodType>(source: string, url: string, schema: S, headers: Record<string, string> = {}): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
  } catch (err) {
    throw new UpstreamError(source, err instanceof Error ? err.name : "network error");
  }
  if (!res.ok) throw new UpstreamError(source, `HTTP ${res.status}`);
  const parsed = schema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new UpstreamError(source, "unexpected response shape");
  return parsed.data;
}
