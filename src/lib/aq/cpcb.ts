import "server-only";
import { z } from "zod";
import { CPCB_BASE_URL, CPCB_RECORD_LIMIT, IST_OFFSET } from "../constants";
import { UpstreamError } from "../errors";
import { fetchJson } from "../fetchJson";
import { distanceKm } from "../cities";
import type { Concentrations, GeoQuery, StationReading } from "./types";
import { asPollutant, toUgM3 } from "./units";

const numeric = z.union([z.string(), z.number()]).nullish();

const CpcbSchema = z.object({
  records: z.array(
    z.object({
      station: z.string(),
      last_update: z.string(),
      latitude: numeric,
      longitude: numeric,
      pollutant_id: z.string(),
      avg_value: numeric,
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

/**
 * Fallback source: CPCB real-time AQI feed on data.gov.in, filtered by city.
 * Picks the station nearest to the requested coordinates.
 * shortcut: assumes CPCB standard units (µg/m³; CO in mg/m³) since the feed has no unit field.
 * @param query - coordinates plus city name
 * @param apiKey - data.gov.in key
 */
export async function fetchCPCB({ lat, lon, city }: GeoQuery, apiKey: string): Promise<StationReading> {
  if (!city) throw new UpstreamError("CPCB", "city required");
  const params = new URLSearchParams({ "api-key": apiKey, format: "json", limit: String(CPCB_RECORD_LIMIT), "filters[city]": city });
  const { records } = await fetchJson("CPCB", `${CPCB_BASE_URL}?${params}`, CpcbSchema);

  const stations = new Map<string, { pollutants: Concentrations; measuredAt?: string; km: number }>();
  for (const r of records) {
    const pollutant = asPollutant(r.pollutant_id);
    const value = Number(r.avg_value);
    if (!pollutant || r.avg_value === null || r.avg_value === undefined || !Number.isFinite(value)) continue;
    const entry = stations.get(r.station) ?? {
      pollutants: {},
      measuredAt: parseCpcbTime(r.last_update),
      km: distanceKm(lat, lon, Number(r.latitude), Number(r.longitude)),
    };
    const ug = toUgM3(pollutant, value, pollutant === "co" ? "mg/m³" : "µg/m³");
    if (ug !== undefined) entry.pollutants[pollutant] = ug;
    stations.set(r.station, entry);
  }

  const candidates = [...stations.entries()]
    .filter(([, s]) => s.measuredAt && (s.pollutants.pm25 !== undefined || s.pollutants.pm10 !== undefined))
    .sort(([, a], [, b]) => (Number.isFinite(a.km) ? a.km : Infinity) - (Number.isFinite(b.km) ? b.km : Infinity));
  const nearest = candidates[0];
  if (!nearest) throw new UpstreamError("CPCB", `no station with particulate data in ${city}`);
  const [name, s] = nearest;
  return { source: "CPCB", station: { id: `cpcb:${name}`, name }, pollutants: s.pollutants, measuredAt: s.measuredAt as string };
}
