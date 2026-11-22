import "server-only";
import { z } from "zod";
import { OPENAQ_BASE_URL, OPENAQ_LOCATION_LIMIT, OPENAQ_RADIUS_M, STALE_AFTER_MS } from "../constants";
import { UpstreamError } from "../errors";
import { fetchJson } from "../fetchJson";
import type { Concentrations, GeoQuery, StationReading } from "./types";
import { asPollutant, toUgM3 } from "./units";

const LocationsSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string().nullish(),
      locality: z.string().nullish(),
      distance: z.number().nullish(),
      sensors: z.array(z.object({ id: z.number(), parameter: z.object({ name: z.string(), units: z.string() }) })),
    }),
  ),
});

const LatestSchema = z.object({
  results: z.array(z.object({ datetime: z.object({ utc: z.string() }), value: z.number(), sensorsId: z.number() })),
});

type Location = z.infer<typeof LocationsSchema>["results"][number];

/** Sensors at a site can be years out of date; only use values close to the site's freshest one. */
const SAME_READING_WINDOW_MS = STALE_AFTER_MS;

async function readLocation(loc: Location, headers: Record<string, string>): Promise<StationReading | null> {
  const latest = await fetchJson("OpenAQ", `${OPENAQ_BASE_URL}/locations/${loc.id}/latest`, LatestSchema, headers);
  const sensors = new Map(loc.sensors.map((s) => [s.id, s.parameter]));
  const newest = Math.max(...latest.results.map((r) => Date.parse(r.datetime.utc)).filter(Number.isFinite));
  if (!Number.isFinite(newest)) return null;

  const pollutants: Concentrations = {};
  for (const r of latest.results) {
    const param = sensors.get(r.sensorsId);
    const pollutant = param && asPollutant(param.name);
    if (!param || !pollutant || newest - Date.parse(r.datetime.utc) > SAME_READING_WINDOW_MS) continue;
    const ug = toUgM3(pollutant, r.value, param.units);
    if (ug !== undefined) pollutants[pollutant] = ug;
  }
  if (pollutants.pm25 === undefined && pollutants.pm10 === undefined) return null;
  return {
    source: "OpenAQ",
    station: { id: `openaq:${loc.id}`, name: [loc.name, loc.locality].filter(Boolean).join(", ") || `OpenAQ #${loc.id}` },
    pollutants,
    measuredAt: new Date(newest).toISOString(),
  };
}

/**
 * Finds the nearest OpenAQ station with a recent particulate reading.
 * Candidate stations are queried in parallel.
 * @param query - coordinates
 * @param apiKey - OpenAQ v3 key
 * @param now - clock for freshness ranking
 */
export async function fetchOpenAQ({ lat, lon }: GeoQuery, apiKey: string, now = Date.now()): Promise<StationReading> {
  const headers = { "X-API-Key": apiKey };
  const url = `${OPENAQ_BASE_URL}/locations?coordinates=${lat},${lon}&radius=${OPENAQ_RADIUS_M}&limit=${OPENAQ_LOCATION_LIMIT}`;
  const { results } = await fetchJson("OpenAQ", url, LocationsSchema, headers);
  const ordered = [...results].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  const settled = await Promise.allSettled(ordered.map((loc) => readLocation(loc, headers)));
  const readings = settled.flatMap((s) => (s.status === "fulfilled" && s.value ? [s.value] : []));
  // Nearest fresh station wins; fall back to nearest stale one (flagged in the UI).
  const best = readings.find((r) => now - Date.parse(r.measuredAt) <= STALE_AFTER_MS) ?? readings[0];
  if (!best) throw new UpstreamError("OpenAQ", "no station with particulate data nearby");
  return best;
}
