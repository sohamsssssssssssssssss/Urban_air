import "server-only";
import { z } from "zod";
import { CLOCK_SKEW_MS, CPCB_BASE_URL, CPCB_RECORD_LIMIT, IST_OFFSET, MAX_READING_AGE_MS, STALE_AFTER_MS } from "../constants";
import { UpstreamError } from "../errors";
import { fetchJson } from "../fetchJson";
import { distanceKm } from "../cities";
import type { GeoQuery, StationReading, SubIndices } from "./types";
import { asPollutant } from "./units";

const text = z.union([z.string(), z.number()]).nullish();

const CpcbSchema = z.object({
  records: z.array(
    z.object({
      station: z.string(),
      last_update: z.string(),
      latitude: text,
      longitude: text,
      pollutant_id: z.string(),
      avg_value: text,
    }),
  ),
});

/** "22-11-2026 17:00:00" (IST) -> ISO string. */
export function parseCpcbTime(value: string): string | undefined {
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return undefined;
  const [, d, mo, y, h, mi, s] = m;
  const t = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}${IST_OFFSET}`);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

const MAX_SUB_INDEX = 500;

/**
 * CPCB station readings ranked by freshness tier, distance, then measurement age.
 * Verified against live responses: `avg_value` is the pollutant's NAQI **sub-index**, not a
 * concentration (dataset title is "Air Quality Index"; CO values reach ~110, which as mg/m³
 * would be about 3× the top of the Severe band). We therefore use the values as sub-indices directly.
 * Missing values arrive as "NA" and are skipped.
 * @param query - coordinates plus city name
 * @param apiKey - data.gov.in key
 */
export async function fetchCpcbStations({ lat, lon, city }: GeoQuery, apiKey: string, now = Date.now()): Promise<StationReading[]> {
  if (!city) throw new UpstreamError("CPCB", "city required");
  const params = new URLSearchParams({ "api-key": apiKey, format: "json", limit: String(CPCB_RECORD_LIMIT), "filters[city]": city });
  const { records } = await fetchJson("CPCB", `${CPCB_BASE_URL}?${params}`, CpcbSchema);

  const stations = new Map<string, { name: string; subIndices: SubIndices; measuredAt: string; age: number; distanceM?: number }>();
  for (const r of records) {
    const pollutant = asPollutant(r.pollutant_id);
    const value = Number(r.avg_value);
    if (!pollutant || r.avg_value === null || r.avg_value === undefined || r.avg_value === "" || !Number.isFinite(value) || value < 0 || value > MAX_SUB_INDEX) continue;
    const measuredAt = parseCpcbTime(r.last_update);
    if (!measuredAt) continue;
    const age = now - Date.parse(measuredAt);
    if (age < -CLOCK_SKEW_MS || age > MAX_READING_AGE_MS) continue;
    const key = `${r.station}|${measuredAt}`;
    const distanceM = distanceKm(lat, lon, Number(r.latitude || NaN), Number(r.longitude || NaN)) * 1000;
    const entry = stations.get(key) ?? { name: r.station, subIndices: {}, measuredAt, age, distanceM: Number.isFinite(distanceM) ? distanceM : undefined };
    entry.subIndices[pollutant] = Math.round(value);
    stations.set(key, entry);
  }

  return [...stations.values()]
    .filter((s) => s.subIndices.pm25 !== undefined || s.subIndices.pm10 !== undefined)
    .sort((a, b) => Number(a.age >= STALE_AFTER_MS) - Number(b.age >= STALE_AFTER_MS)
      || (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity) || a.age - b.age)
    .map(({ name, distanceM, subIndices, measuredAt }) => (
      { source: "CPCB", station: { id: `cpcb:${name}`, name, distanceM }, pollutants: {}, subIndices, measuredAt }
    ));
}

/** Best CPCB station for a direct source comparison. */
export async function fetchCPCB(query: GeoQuery, apiKey: string): Promise<StationReading> {
  const [nearest] = await fetchCpcbStations(query, apiKey);
  if (!nearest) throw new UpstreamError("CPCB", `no station with particulate data in ${query.city}`);
  return nearest;
}
