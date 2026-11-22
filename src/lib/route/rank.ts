import { ROUTE_MODES } from "./constants";
import type { RouteLabel, ScoredRoute } from "./types";

const byExposure = (a: ScoredRoute, b: ScoredRoute) => a.pm25Ug - b.pm25Ug || a.durationMin - b.durationMin || a.alt - b.alt;
const byDuration = (a: ScoredRoute, b: ScoredRoute) => a.durationMin - b.durationMin || a.pm25Ug - b.pm25Ug || a.alt - b.alt;

/** Alternatives for one mode, cleanest first (ties: faster, then OSRM order). */
export function sortAlternatives(routes: ScoredRoute[]): ScoredRoute[] {
  return [...routes].sort(byExposure);
}

/** Standard competition rank (1 = best; equal values share a rank). */
const rankOf = (value: number, all: number[]) => 1 + all.filter((v) => v < value).length;

/**
 * Picks the three labelled routes among the best route of each mode.
 * - cleanest: lowest estimated PM2.5 inhaled (ties: faster)
 * - fastest: lowest duration (ties: cleaner)
 * - balance: lowest sum of the exposure rank and the duration rank (ties: cleaner, faster, mode order)
 * With one candidate it holds all three labels.
 * @param candidates - best route per mode
 * @returns labelled routes, or null when there are no candidates
 */
export function labelRoutes(candidates: ScoredRoute[]): Record<RouteLabel, ScoredRoute> | null {
  if (candidates.length === 0) return null;
  const exposures = candidates.map((c) => c.pm25Ug);
  const durations = candidates.map((c) => c.durationMin);
  const combined = (c: ScoredRoute) => rankOf(c.pm25Ug, exposures) + rankOf(c.durationMin, durations);
  const modeOrder = (c: ScoredRoute) => ROUTE_MODES.indexOf(c.mode);
  const [cleanest] = [...candidates].sort((a, b) => byExposure(a, b) || modeOrder(a) - modeOrder(b));
  const [fastest] = [...candidates].sort((a, b) => byDuration(a, b) || modeOrder(a) - modeOrder(b));
  const [balance] = [...candidates].sort((a, b) => combined(a) - combined(b) || byExposure(a, b) || byDuration(a, b) || modeOrder(a) - modeOrder(b));
  return { cleanest: cleanest as ScoredRoute, fastest: fastest as ScoredRoute, balance: balance as ScoredRoute };
}
