import { CO2_KG_PER_PKM } from "../constants";
import { doseForHours } from "../impact/exposure";
import { MAJOR_ROAD_FACTOR, SIDE_ROAD_FACTOR } from "./constants";
import type { Ambient, RawRoute, RouteMode, ScoredRoute } from "./types";

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const HOURS_PER_DAY = 24;
const IST_OFFSET_MIN = 330;
const M_PER_KM = 1000;

/** PM2.5 for an IST hour, using the nearest hour (circular) that has data. */
function valueForHour(byHour: Map<number, number>, hour: number): number {
  for (let d = 0; d <= HOURS_PER_DAY / 2; d++) {
    const v = byHour.get(hour) ?? byHour.get((hour + d) % HOURS_PER_DAY) ?? byHour.get((hour - d + HOURS_PER_DAY) % HOURS_PER_DAY);
    if (v !== undefined) return v;
  }
  return 0;
}

/**
 * Mean ambient PM2.5 over a trip, sampling each minute against the station's 24 h hourly profile.
 * The profile is assumed to repeat daily, so a trip at 08:00 tomorrow uses today's 08:00 value.
 * @param byHour - PM2.5 per IST hour of day
 * @param departIso - departure time (ISO)
 * @param durationMin - trip length in minutes
 */
export function averageAmbient(byHour: Map<number, number>, departIso: string, durationMin: number): number {
  const startMin = Date.parse(departIso) / 60_000 + IST_OFFSET_MIN;
  const samples = Math.max(1, Math.ceil(durationMin));
  let sum = 0;
  for (let m = 0; m < samples; m++) sum += valueForHour(byHour, Math.floor(((startMin + m) / MINUTES_PER_HOUR) % HOURS_PER_DAY));
  return sum / samples;
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Estimated PM2.5 inhaled and CO₂ for one route. The estimate is
 * ambient × road factor × in-mode ratio × breathing rate × hours; it is a model, never a measurement.
 * @param mode - route mode
 * @param alt - alternative number (1-based)
 * @param raw - OSRM route
 * @param ambient - how ambient PM2.5 is obtained
 * @param departIso - departure time (ISO)
 */
export function scoreRoute(mode: RouteMode, alt: number, raw: RawRoute, ambient: Ambient, departIso: string): ScoredRoute {
  const durationMin = raw.durationS / SECONDS_PER_MINUTE;
  const ambientUgm3 = ambient.byHour ? averageAmbient(ambient.byHour, departIso, durationMin) : (ambient.flat ?? 0);
  const roadFactor = SIDE_ROAD_FACTOR + raw.majorShare * (MAJOR_ROAD_FACTOR - SIDE_ROAD_FACTOR);
  const distanceKm = raw.distanceM / M_PER_KM;
  return {
    id: `${mode}-${alt}`,
    mode,
    alt,
    distanceKm: round(distanceKm, 1),
    durationMin: Math.round(durationMin),
    pm25Ug: round(doseForHours(mode, durationMin / MINUTES_PER_HOUR) * ambientUgm3 * roadFactor, 1),
    co2Kg: round(CO2_KG_PER_PKM[mode] * distanceKm, 2),
    ambientUgm3: round(ambientUgm3, 1),
    majorShare: round(raw.majorShare, 2),
    roadAdjustment: raw.majorShare > 0 ? "applied" : "not-applied",
  };
}
