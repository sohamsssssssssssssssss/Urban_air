import "server-only";
import { z } from "zod";
import { createTtlCache } from "../cache";
import { GeocodeUnavailableError, PlaceNotFoundError, UpstreamError } from "../errors";
import { fetchJson } from "../fetchJson";
import { GEOCODE_CACHE_TTL_MS, NOMINATIM_MIN_INTERVAL_MS, NOMINATIM_URL } from "./constants";
import type { Place } from "./types";

const ResultSchema = z.array(z.object({ lat: z.string(), lon: z.string(), display_name: z.string() }));
/** Nominatim policy: identify the application. No personal details. */
const HEADERS = { "User-Agent": "SmogSense/2.0 (air-quality route planner)" };
const LABEL_MAX = 90;
const cache = createTtlCache<Place>(GEOCODE_CACHE_TTL_MS);

// Serialise upstream calls so we never exceed 1 request/second, even for concurrent users.
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCall + NOMINATIM_MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCall = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Looks up a place name in India via Nominatim. Results are cached for 24 h.
 * @throws PlaceNotFoundError when nothing matches, GeocodeUnavailableError when Nominatim fails
 */
export function geocode(query: string): Promise<Place> {
  const key = query.trim().toLowerCase().replace(/\s+/g, " ");
  return cache.getOrLoad(key, async () => {
    const url = `${NOMINATIM_URL}?${new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "in", q: key })}`;
    let results: z.infer<typeof ResultSchema>;
    try {
      results = await throttled(() => fetchJson("Nominatim", url, ResultSchema, HEADERS));
    } catch (err) {
      if (err instanceof UpstreamError) throw new GeocodeUnavailableError();
      throw err;
    }
    const hit = results[0];
    const lat = Number(hit?.lat);
    const lon = Number(hit?.lon);
    if (!hit || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new PlaceNotFoundError();
    return { lat, lon, label: hit.display_name.slice(0, LABEL_MAX) };
  });
}
