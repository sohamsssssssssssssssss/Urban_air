import "server-only";
import { getAirQuality } from "@/lib/aq";
import type { AqiCategory, Pollutant } from "@/lib/aq/types";
import { AQUnavailableError, GeocodeUnavailableError, PlaceNotFoundError } from "@/lib/errors";
import { formatWindow, timingFromHistory } from "@/lib/impact/timing";
import { geocode } from "@/lib/route/geocode";
import type { ComparePlace, CompareRequest } from "./schema";

export type SideError = "AQ_UNAVAILABLE" | "PLACE_NOT_FOUND" | "GEOCODE_UNAVAILABLE";

export type CompareSide =
  | {
      status: "ok";
      label: string;
      aqi: number;
      category: AqiCategory;
      dominant: Pollutant;
      station: string;
      source: "OpenAQ" | "CPCB";
      measuredAt: string;
      stale: boolean;
      bestWindow: string;
      /** True when the window comes from this station's measured last 24 h, false for the documented default. */
      windowMeasured: boolean;
    }
  | { status: "unavailable"; label: string; code: SideError };

export interface CompareResult {
  a: CompareSide;
  b: CompareSide;
}

const labelOf = (p: ComparePlace) => ("query" in p ? p.query : (p.city ?? `${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`));

async function side(place: ComparePlace): Promise<CompareSide> {
  const label = labelOf(place);
  try {
    const resolved = "query" in place ? await geocode(place.query) : place;
    const name = "label" in resolved ? resolved.label : label;
    const snapshot = await getAirQuality({ lat: resolved.lat, lon: resolved.lon, city: "city" in resolved ? resolved.city : undefined });
    const timing = timingFromHistory(snapshot.history);
    return {
      status: "ok", label: name, aqi: snapshot.aqi, category: snapshot.category, dominant: snapshot.dominant, station: snapshot.station.name,
      source: snapshot.source, measuredAt: snapshot.measuredAt, stale: snapshot.stale, bestWindow: formatWindow(timing.best), windowMeasured: timing.measured,
    };
  } catch (err) {
    if (err instanceof PlaceNotFoundError) return { status: "unavailable", label, code: "PLACE_NOT_FOUND" };
    if (err instanceof GeocodeUnavailableError) return { status: "unavailable", label, code: "GEOCODE_UNAVAILABLE" };
    if (err instanceof AQUnavailableError) return { status: "unavailable", label, code: "AQ_UNAVAILABLE" };
    throw err;
  }
}

/**
 * Live air quality at two places, side by side. Each side resolves on its own, so one place failing
 * (not found, no data) never hides the other. Uses the cached `getAirQuality`.
 * Both sides start together; the shared geocoder queues place searches so Nominatim's 1 request per second holds.
 */
export async function compareAir({ a, b }: CompareRequest): Promise<CompareResult> {
  const [first, second] = await Promise.all([side(a), side(b)]);
  return { a: first, b: second };
}
