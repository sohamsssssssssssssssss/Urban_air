import "server-only";
import { AQ_CACHE_TTL_MS, CLOCK_SKEW_MS, COORD_CACHE_DECIMALS, MAX_READING_AGE_MS, STALE_AFTER_MS } from "../constants";
import { createTtlCache } from "../cache";
import { env } from "../env";
import { AQUnavailableError } from "../errors";
import { nearestCity } from "../cities";
import { aqiFromSubIndices, subIndicesFor } from "./naqi";
import { fetchCPCB } from "./cpcb";
import { fetchOpenAQ } from "./openaq";
import type { AQSnapshot, GeoQuery, StationReading } from "./types";

export type { AQSnapshot, GeoQuery } from "./types";

const cache = createTtlCache<AQSnapshot>(AQ_CACHE_TTL_MS);

/**
 * Turns a raw station reading into the normalised snapshot (NAQI + staleness).
 * @returns snapshot, or null when there is no particulate data or the reading is too old / in the future
 */
export function toSnapshot(reading: StationReading, now = Date.now()): AQSnapshot | null {
  const age = now - Date.parse(reading.measuredAt);
  if (!(age <= MAX_READING_AGE_MS && age >= -CLOCK_SKEW_MS)) return null;
  const subIndices = reading.subIndices ?? subIndicesFor(reading.pollutants);
  const result = aqiFromSubIndices(subIndices);
  if (!result) return null;
  return { ...reading, subIndices, ...result, fetchedAt: new Date(now).toISOString(), stale: age > STALE_AFTER_MS };
}

async function loadFromSources(query: GeoQuery): Promise<AQSnapshot> {
  const city = query.city ?? nearestCity(query.lat, query.lon).name;
  const sources: Array<() => Promise<StationReading>> = [];
  if (env.OPENAQ_API_KEY) sources.push(() => fetchOpenAQ(query, env.OPENAQ_API_KEY as string));
  if (env.DATA_GOV_IN_API_KEY) sources.push(() => fetchCPCB({ ...query, city }, env.DATA_GOV_IN_API_KEY as string));

  for (const load of sources) {
    try {
      const snapshot = toSnapshot(await load());
      if (snapshot) return snapshot;
    } catch (err) {
      console.warn("AQ source failed, trying next", err instanceof Error ? err.message : err);
    }
  }
  throw new AQUnavailableError();
}

/**
 * Live air quality for a location: OpenAQ first, then CPCB, else AQUnavailableError.
 * Cached for 10 minutes per ~1 km grid cell; concurrent identical requests share one fetch.
 * @param query - coordinates and optional city
 */
export function getAirQuality(query: GeoQuery): Promise<AQSnapshot> {
  const key = `${query.lat.toFixed(COORD_CACHE_DECIMALS)},${query.lon.toFixed(COORD_CACHE_DECIMALS)}`;
  return cache.getOrLoad(key, () => loadFromSources(query));
}
