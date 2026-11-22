import "server-only";
import { distanceKm } from "../cities";
import { RouteUnavailableError, ValidationError } from "../errors";
import { ROUTE_MODES, ROUTE_DEPART_FUTURE_MS, ROUTE_DEPART_PAST_MS, ROUTE_MAX_STRAIGHT_KM, ROUTE_MIN_STRAIGHT_KM } from "./constants";
import type { AiFailureReason } from "../ai/failure";
import { resolveAmbient } from "./air";
import { scoreRoute } from "./exposure";
import { geocode } from "./geocode";
import { fetchProfile, type OsrmProfile } from "./osrm";
import { labelRoutes, sortAlternatives } from "./rank";
import { buildCards } from "./reason";
import { rewriteReasons } from "./reasonsAi";
import type { PlaceInput, RouteRequest } from "./request";
import type { Ambient, Place, RawRoute, RouteCard, RouteMode, ScoredRoute } from "./types";

export interface RouteResult {
  origin: Place;
  destination: Place;
  departAt: string;
  /** True when ambient PM2.5 is approximate (no monitor within 25 km, city-level reading, or inferred from a sub-index). */
  approximate: boolean;
  air: Pick<Ambient, "station" | "source" | "measuredAt" | "basis">;
  modes: Array<{ mode: RouteMode; routes: ScoredRoute[] }>;
  unavailableModes: RouteMode[];
  cards: RouteCard[];
  reasonsBy: "gemini" | "computed";
  fallbackReason?: AiFailureReason;
}

/** OSRM has no motorcycle profile, so two-wheelers share the car road network. */
const PROFILE: Record<RouteMode, OsrmProfile> = { walk: "foot", cycle: "bike", two_wheeler: "car", car: "car" };

const resolvePlace = (input: PlaceInput): Promise<Place> =>
  "query" in input ? geocode(input.query) : Promise.resolve({ lat: input.lat, lon: input.lon, label: `${input.lat.toFixed(4)}, ${input.lon.toFixed(4)}` });

function checkDeparture(departAt: string | undefined, now: number): string {
  if (!departAt) return new Date(now).toISOString();
  const t = Date.parse(departAt);
  if (t < now - ROUTE_DEPART_PAST_MS || t > now + ROUTE_DEPART_FUTURE_MS) throw new ValidationError("Invalid fields: departAt (must be within the next 24 hours)");
  return new Date(t).toISOString();
}

/**
 * Plans routes between two places: OSRM alternatives per mode, estimated PM2.5 inhaled for each (code, not AI),
 * the best route per mode, and the Cleanest / Fastest / Best balance labels across modes.
 * @throws ValidationError, PlaceNotFoundError, GeocodeUnavailableError, RouteUnavailableError, AQUnavailableError
 */
export async function planRoutes(req: RouteRequest, now = Date.now()): Promise<RouteResult> {
  const departAt = checkDeparture(req.departAt, now);
  const origin = await resolvePlace(req.origin);
  const destination = await resolvePlace(req.destination); // sequential: Nominatim allows 1 request/second
  const straightKm = distanceKm(origin.lat, origin.lon, destination.lat, destination.lon);
  if (straightKm > ROUTE_MAX_STRAIGHT_KM) throw new ValidationError(`Choose places within ${ROUTE_MAX_STRAIGHT_KM} km of each other.`);
  if (straightKm < ROUTE_MIN_STRAIGHT_KM) throw new ValidationError("Origin and destination are the same place.");

  const profiles = [...new Set(Object.values(PROFILE))];
  const [settled, ambient] = await Promise.all([
    Promise.allSettled(profiles.map((p) => fetchProfile(p, origin, destination))),
    resolveAmbient(origin),
  ]);
  const raw = new Map<OsrmProfile, RawRoute[]>(profiles.flatMap((p, i) => { const s = settled[i]; return s?.status === "fulfilled" ? [[p, s.value] as const] : []; }));

  const modes = ROUTE_MODES.flatMap((mode) => {
    const routes = (raw.get(PROFILE[mode]) ?? []).map((r, i) => scoreRoute(mode, i + 1, r, ambient, departAt));
    return routes.length ? [{ mode, routes: sortAlternatives(routes) }] : [];
  });
  if (modes.length === 0) throw new RouteUnavailableError();

  const labelled = labelRoutes(modes.map((m) => m.routes[0] as ScoredRoute));
  if (!labelled) throw new RouteUnavailableError();
  const reasons = await rewriteReasons(buildCards(labelled, req.language), req.language);
  return {
    origin, destination, departAt, approximate: ambient.approximate,
    air: { station: ambient.station, source: ambient.source, measuredAt: ambient.measuredAt, basis: ambient.basis },
    modes, unavailableModes: ROUTE_MODES.filter((m) => !modes.some((x) => x.mode === m)),
    cards: reasons.cards, reasonsBy: reasons.generatedBy, fallbackReason: reasons.fallbackReason,
  };
}

