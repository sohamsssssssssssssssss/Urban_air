import "server-only";
import { z } from "zod";
import { CLOCK_SKEW_MS, HISTORY_HOURS, HOUR_MS, MAX_READING_AGE_MS, OPENAQ_BASE_URL, OPENAQ_CANDIDATES, OPENAQ_LOCATION_LIMIT, OPENAQ_RADIUS_M, STALE_AFTER_MS } from "../constants";
import { UpstreamError } from "../errors";
import { fetchJson } from "../fetchJson";
import { aqiConcentration, subIndicesFor } from "./naqi";
import type { Concentrations, GeoQuery, Pollutant, StationReading } from "./types";
import { asPollutant, toUgM3 } from "./units";

const Sensor = z.object({ id: z.number(), parameter: z.object({ name: z.string(), units: z.string() }) });
const LocationsSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string().nullish(),
      locality: z.string().nullish(),
      distance: z.number().nullish(),
      datetimeLast: z.object({ utc: z.string() }).nullish(),
      sensors: z.array(Sensor),
    }),
  ),
});
const LatestSchema = z.object({ results: z.array(z.object({ datetime: z.object({ utc: z.string() }), value: z.number(), sensorsId: z.number() })) });
const HoursSchema = z.object({ results: z.array(z.object({ value: z.number(), period: z.object({ datetimeFrom: z.object({ utc: z.string() }) }) })) });

type Location = z.infer<typeof LocationsSchema>["results"][number];
interface LatestSensor { ug: number; t: number; sensorId: number; units: string }
interface Picked { reading: StationReading; sensors: Map<Pollutant, LatestSensor> }

/** A timestamp is usable if it is neither too old nor implausibly in the future. */
const usable = (iso: string, now: number) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t <= now + CLOCK_SKEW_MS && now - t <= MAX_READING_AGE_MS;
};

async function readLocation(loc: Location, headers: Record<string, string>, now: number): Promise<Picked | null> {
  const latest = await fetchJson("OpenAQ", `${OPENAQ_BASE_URL}/locations/${loc.id}/latest`, LatestSchema, headers);
  const sensors = new Map(loc.sensors.map((s) => [s.id, s.parameter]));
  // Sites often run duplicate sensors for one pollutant (e.g. µg/m³ and ppb): keep the freshest valid one.
  const best = new Map<Pollutant, LatestSensor>();
  for (const r of latest.results) {
    const param = sensors.get(r.sensorsId);
    const pollutant = param && asPollutant(param.name);
    if (!param || !pollutant || !usable(r.datetime.utc, now)) continue;
    const ug = toUgM3(pollutant, r.value, param.units);
    const t = Date.parse(r.datetime.utc);
    if (ug !== undefined && t > (best.get(pollutant)?.t ?? -Infinity)) best.set(pollutant, { ug, t, sensorId: r.sensorsId, units: param.units });
  }
  const pm = [best.get("pm25"), best.get("pm10")].filter((x) => x !== undefined);
  if (pm.length === 0) return null;
  const pm25 = best.get("pm25");
  const pollutants: Concentrations = Object.fromEntries([...best].map(([p, v]) => [p, v.ug]));
  return {
    reading: {
      source: "OpenAQ",
      station: { id: `openaq:${loc.id}`, name: [loc.name, loc.locality].filter(Boolean).join(", ") || `OpenAQ #${loc.id}`, distanceM: loc.distance ?? undefined },
      pollutants,
      pm25MeasuredAt: pm25 && new Date(pm25.t).toISOString(),
      measuredAt: new Date(Math.max(...pm.map((x) => x.t))).toISOString(),
    },
    sensors: best,
  };
}

/** Hourly concentrations in µg/m³. A failed sensor request leaves its sub-index provisional. */
async function readHistory(pollutant: Pollutant, sensor: LatestSensor, headers: Record<string, string>) {
  const from = new Date(sensor.t - HISTORY_HOURS * HOUR_MS).toISOString();
  const url = `${OPENAQ_BASE_URL}/sensors/${sensor.sensorId}/hours?datetime_from=${from}&datetime_to=${new Date(sensor.t).toISOString()}&limit=${HISTORY_HOURS * 2}`;
  try {
    const { results } = await fetchJson("OpenAQ", url, HoursSchema, headers);
    return results.flatMap((r) => {
      const at = r.period.datetimeFrom.utc;
      const elapsed = sensor.t - Date.parse(at);
      const value = toUgM3(pollutant, r.value, sensor.units);
      return value !== undefined && elapsed >= HOUR_MS && elapsed <= HISTORY_HOURS * HOUR_MS ? [{ at, value }] : [];
    });
  } catch {
    return undefined;
  }
}

/**
 * Nearest OpenAQ station with a recent particulate reading and hourly pollutant history.
 * OpenAQ returns locations unordered and many have been offline for years, so we filter by
 * `datetimeLast`, sort by distance ourselves, and query the nearest few in parallel.
 * @param query - coordinates
 * @param apiKey - OpenAQ v3 key
 * @param now - clock
 */
export async function fetchOpenAQ({ lat, lon }: GeoQuery, apiKey: string, now = Date.now()): Promise<StationReading> {
  const headers = { "X-API-Key": apiKey };
  const url = `${OPENAQ_BASE_URL}/locations?coordinates=${lat},${lon}&radius=${OPENAQ_RADIUS_M}&limit=${OPENAQ_LOCATION_LIMIT}`;
  const { results } = await fetchJson("OpenAQ", url, LocationsSchema, headers);
  const candidates = results
    .filter((l) => l.datetimeLast && usable(l.datetimeLast.utc, now))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, OPENAQ_CANDIDATES);

  const settled = await Promise.allSettled(candidates.map((loc) => readLocation(loc, headers, now)));
  const picked = settled.flatMap((s) => (s.status === "fulfilled" && s.value ? [s.value] : []));
  const best = picked.find((p) => now - Date.parse(p.reading.measuredAt) <= STALE_AFTER_MS) ?? picked[0];
  if (!best) throw new UpstreamError("OpenAQ", "no station with recent particulate data nearby");
  const aqConcentrations: Concentrations = {};
  let history: StationReading["history"];
  let provisional = false;
  await Promise.all([...best.sensors].map(async ([pollutant, sensor]) => {
    const points = await readHistory(pollutant, sensor, headers);
    const averaged = aqiConcentration(pollutant, points ?? [], sensor.t);
    aqConcentrations[pollutant] = averaged ?? sensor.ug;
    if (averaged === undefined) provisional = true;
    if (pollutant === "pm25") history = points?.map(({ at, value }) => ({ at, pm25: value }));
  }));
  return { ...best.reading, history, subIndices: subIndicesFor(aqConcentrations), provisional };
}
