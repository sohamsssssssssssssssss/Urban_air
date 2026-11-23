import "server-only";
import { z } from "zod";
import { createTtlCache } from "../cache";
import { fetchJson } from "../fetchJson";
import { MAJOR_ROAD_CLASSES, OSRM_BASE_URL, ROUTE_CACHE_TTL_MS } from "./constants";
import type { Place, RawRoute } from "./types";

const COORD_DP = 5;
const Step = z.object({
  distance: z.number(),
  ref: z.string().nullish(),
  intersections: z.array(z.object({ classes: z.array(z.string()).nullish() })).default([]),
});
const OsrmSchema = z.object({
  code: z.string(),
  routes: z.array(z.object({ distance: z.number(), duration: z.number(), legs: z.array(z.object({ steps: z.array(Step) })) })).default([]),
});
export type OsrmResponse = z.infer<typeof OsrmSchema>;
export type OsrmProfile = keyof typeof OSRM_BASE_URL;

const cache = createTtlCache<RawRoute[]>(ROUTE_CACHE_TTL_MS);

/**
 * Reduces an OSRM response to scoring inputs. `majorShare` is the share of distance on steps that carry a
 * road `ref` (numbered highways) or a major class. OSRM's public profiles expose few of these, so it is
 * often 0; callers then report the road adjustment as "not applied" instead of guessing.
 */
export function parseRoutes(response: OsrmResponse): RawRoute[] {
  if (response.code !== "Ok") return [];
  return response.routes.map((route) => {
    const steps = route.legs.flatMap((leg) => leg.steps);
    const major = steps
      .filter((s) => s.ref || s.intersections.some((i) => i.classes?.some((c) => (MAJOR_ROAD_CLASSES as readonly string[]).includes(c))))
      .reduce((sum, s) => sum + s.distance, 0);
    return { distanceM: route.distance, durationS: route.duration, majorShare: route.distance > 0 ? Math.min(1, major / route.distance) : 0 };
  });
}

/**
 * Routes with alternatives for one OSRM profile (FOSSGIS public server). Cached 10 min.
 * @throws UpstreamError on network, HTTP or payload failure
 */
export function fetchProfile(profile: OsrmProfile, from: Place, to: Place): Promise<RawRoute[]> {
  const pt = (p: Place) => `${p.lon.toFixed(COORD_DP)},${p.lat.toFixed(COORD_DP)}`;
  return cache.getOrLoad(`${profile}|${pt(from)}|${pt(to)}`, async () => {
    const url = `${OSRM_BASE_URL[profile]}/route/v1/driving/${pt(from)};${pt(to)}?alternatives=true&steps=true&overview=false`;
    return parseRoutes(await fetchJson("OSRM", url, OsrmSchema));
  });
}
