import { HISTORY_HOURS, HOUR_MS } from "../constants";
import { CATEGORIES, POLLUTANTS, type AqiCategory, type Concentrations, type Pollutant, type SubIndices } from "./types";

/** Index value at the top of each category band: Good..Severe. */
const INDEX_UPPER = [50, 100, 200, 300, 400, 500] as const;

/**
 * CPCB National AQI breakpoints: upper concentration of each band (µg/m³; CO in mg/m³).
 * Source: CPCB "National Air Quality Index" (2014). CPCB leaves the Severe band open-ended;
 * we extrapolate it with the width of the Very Poor band and cap the index at 500.
 */
const BREAKPOINTS: Record<Pollutant, readonly number[]> = {
  pm25: [30, 60, 90, 120, 250, 380],
  pm10: [50, 100, 250, 350, 430, 510],
  no2: [40, 80, 180, 280, 400, 520],
  o3: [50, 100, 168, 208, 748, 1288],
  co: [1, 2, 10, 17, 34, 51],
  so2: [40, 80, 380, 800, 1600, 2400],
  nh3: [200, 400, 800, 1200, 1800, 2400],
};

const UG_PER_MG = 1000;
const MIN_24H_SAMPLES = 16;
const SHORT_WINDOW_HOURS = 8;

/** Uses distinct completed hours, anchored at this sensor's latest measurement end. */
export function aqiConcentration(
  pollutant: Pollutant,
  history: ReadonlyArray<{ at: string; value: number }>,
  end: number,
): number | undefined {
  const hours = new Map<number, number>();
  for (const { at, value } of history) {
    const elapsed = end - Date.parse(at);
    if (elapsed >= HOUR_MS && elapsed <= HISTORY_HOURS * HOUR_MS && Number.isFinite(value) && value >= 0) {
      hours.set(Math.floor(elapsed / HOUR_MS), value);
    }
  }
  if (pollutant === "co" || pollutant === "o3") {
    let max: number | undefined;
    for (let start = 1; start <= HISTORY_HOURS - SHORT_WINDOW_HOURS + 1; start++) {
      const window = Array.from({ length: SHORT_WINDOW_HOURS }, (_, i) => hours.get(start + i));
      if (window.every((value) => value !== undefined)) {
        const mean = window.reduce((sum, value) => sum + value, 0) / SHORT_WINDOW_HOURS;
        max = Math.max(max ?? mean, mean);
      }
    }
    return max;
  }
  if (hours.size < MIN_24H_SAMPLES) return undefined;
  return [...hours.values()].reduce((sum, value) => sum + value, 0) / hours.size;
}

/**
 * NAQI sub-index for one pollutant via linear interpolation within its band.
 * @param pollutant - pollutant key
 * @param ugm3 - concentration in µg/m³ (CO is converted to mg/m³ internally)
 * @returns sub-index 0..500, rounded
 */
export function subIndex(pollutant: Pollutant, ugm3: number): number {
  const c = pollutant === "co" ? ugm3 / UG_PER_MG : ugm3;
  if (c <= 0) return 0;
  const bands = BREAKPOINTS[pollutant];
  let cLo = 0;
  let iLo = 0;
  for (const [i, cHi] of bands.entries()) {
    const iHi = INDEX_UPPER[i] ?? 500;
    if (c <= cHi) return Math.round(iLo + ((c - cLo) / (cHi - cLo)) * (iHi - iLo));
    cLo = cHi;
    iLo = iHi;
  }
  return 500;
}

/**
 * Maps an AQI value to its CPCB category.
 * @param aqi - index value
 */
export function categoryFor(aqi: number): AqiCategory {
  const idx = INDEX_UPPER.findIndex((upper) => aqi <= upper);
  return CATEGORIES[idx === -1 ? CATEGORIES.length - 1 : idx] ?? "Severe";
}

export interface AqiResult {
  aqi: number;
  category: AqiCategory;
  dominant: Pollutant;
}

/**
 * Sub-indices for every measured pollutant.
 * @param pollutants - concentrations in µg/m³
 */
export function subIndicesFor(pollutants: Concentrations): SubIndices {
  const out: SubIndices = {};
  for (const p of POLLUTANTS) {
    const c = pollutants[p];
    if (c !== undefined) out[p] = subIndex(p, c);
  }
  return out;
}

/**
 * Overall AQI = max sub-index. Requires a particulate sub-index, since PM drives winter smog
 * and CPCB's NAQI requires PM2.5 or PM10.
 * @returns AQI result, or null when no PM sub-index is present
 */
export function aqiFromSubIndices(sub: SubIndices): AqiResult | null {
  if (sub.pm25 === undefined && sub.pm10 === undefined) return null;
  let best: { aqi: number; dominant: Pollutant } = { aqi: -1, dominant: "pm25" };
  for (const p of POLLUTANTS) {
    const idx = sub[p];
    if (idx !== undefined && idx > best.aqi) best = { aqi: idx, dominant: p };
  }
  return { ...best, category: categoryFor(best.aqi) };
}

/** Convenience: AQI straight from concentrations (µg/m³). */
export function computeAqi(pollutants: Concentrations): AqiResult | null {
  return aqiFromSubIndices(subIndicesFor(pollutants));
}

export const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  o3: "O₃",
  so2: "SO₂",
  co: "CO",
  nh3: "NH₃",
};

/**
 * Inverse of `subIndex`: the concentration (µg/m³; CO in mg/m³ is converted back) that gives a sub-index.
 * Used only when a source publishes sub-indices without concentrations (CPCB); callers must label the result approximate.
 * @param pollutant - pollutant key
 * @param index - sub-index 0..500
 */
export function concentrationFromSubIndex(pollutant: Pollutant, index: number): number {
  const bands = BREAKPOINTS[pollutant];
  let cLo = 0;
  let iLo = 0;
  for (const [i, cHi] of bands.entries()) {
    const iHi = INDEX_UPPER[i] ?? 500;
    if (index <= iHi) return (cLo + ((Math.max(index, 0) - iLo) / (iHi - iLo)) * (cHi - cLo)) * (pollutant === "co" ? UG_PER_MG : 1);
    cLo = cHi;
    iLo = iHi;
  }
  return (bands.at(-1) ?? 0) * (pollutant === "co" ? UG_PER_MG : 1);
}
