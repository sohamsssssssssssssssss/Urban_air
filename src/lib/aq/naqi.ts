import { CATEGORIES, POLLUTANTS, type AqiCategory, type Concentrations, type Pollutant, type SubIndices } from "./types";

/** Index value at the top of each category band: Good..Severe. */
const INDEX_UPPER = [50, 100, 200, 300, 400, 500] as const;

/**
 * CPCB National AQI breakpoints: upper concentration of each band (µg/m³; CO in mg/m³).
 * Source: CPCB "National Air Quality Index" (2014). CPCB leaves the Severe band open-ended;
 * we extrapolate it with the width of the Very Poor band and cap the index at 500.
 * Note: CPCB specifies 24 h (8 h for CO/O3) averages; we apply them to the latest hourly
 * reading, so the result is labelled an estimate in the UI.
 */
const BREAKPOINTS: Record<Pollutant, readonly number[]> = {
  pm25: [30, 60, 90, 120, 250, 380],
  pm10: [50, 100, 250, 350, 430, 510],
  no2: [40, 80, 180, 280, 400, 520],
  o3: [50, 100, 168, 208, 748, 1288],
  co: [1, 2, 10, 17, 34, 51],
  so2: [40, 80, 380, 800, 1600, 2400],
};

const UG_PER_MG = 1000;

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
};
