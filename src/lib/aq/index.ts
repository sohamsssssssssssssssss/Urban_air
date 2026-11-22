import "server-only";
import { AQ_CACHE_TTL_MS, CLOCK_SKEW_MS, COORD_CACHE_DECIMALS, MAX_READING_AGE_MS, STALE_AFTER_MS } from "../constants";
import { createTtlCache } from "../cache";
import { env } from "../env";
import { AQUnavailableError } from "../errors";
import { nearestCity } from "../cities";
import { aqiFromSubIndices, subIndicesFor } from "./naqi";
import { fetchCpcbStations } from "./cpcb";
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
  const provisional = reading.provisional ?? (reading.source === "OpenAQ" && reading.subIndices === undefined);
  return { ...reading, subIndices, ...result, provisional, fetchedAt: new Date(now).toISOString(), stale: age >= STALE_AFTER_MS };
}

const stationName = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

async function loadFromSources(query: GeoQuery): Promise<AQSnapshot> {
  const city = query.city ?? nearestCity(query.lat, query.lon).name;
  const now = Date.now();
  const { OPENAQ_API_KEY, DATA_GOV_IN_API_KEY } = env;
  const [open, official] = await Promise.allSettled([
    OPENAQ_API_KEY && fetchOpenAQ(query, OPENAQ_API_KEY, now),
    DATA_GOV_IN_API_KEY && fetchCpcbStations({ ...query, city }, DATA_GOV_IN_API_KEY, now),
  ]);
  const openAQ = open.status === "fulfilled" && open.value ? toSnapshot(open.value, now) : null;
  const stations = official.status === "fulfilled" ? official.value || [] : [];
  const nearest = stations[0];
  const cpcb = nearest ? toSnapshot(nearest, now) : null;
  if (cpcb && !openAQ) return cpcb;
  if (!openAQ) throw new AQUnavailableError();
  if (cpcb && !cpcb.stale) {
    const name = stationName(openAQ.station.name);
    const match = stations.find((s) => stationName(s.station.name) === name && now - Date.parse(s.measuredAt) < STALE_AFTER_MS);
    const sameStation = match && toSnapshot(match, now);
    if (sameStation) return { ...sameStation, pollutants: openAQ.pollutants, history: openAQ.history, pm25MeasuredAt: openAQ.pm25MeasuredAt };
    if (cpcb.station.distanceM !== undefined && cpcb.station.distanceM <= (openAQ.station.distanceM ?? -1)) return cpcb;
  }
  return openAQ;
}

/**
 * Prefer fresh CPCB at the same or a closer station, with OpenAQ otherwise.
 * Cached for 10 minutes per ~1 km grid cell; concurrent identical requests share one fetch.
 * @param query - coordinates and optional city
 */
export function getAirQuality(query: GeoQuery): Promise<AQSnapshot> {
  const key = `${query.lat.toFixed(COORD_CACHE_DECIMALS)},${query.lon.toFixed(COORD_CACHE_DECIMALS)}`;
  return cache.getOrLoad(key, () => loadFromSources(query));
}
