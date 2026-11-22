import { MOLAR_VOLUME_L, MOLECULAR_WEIGHT } from "../constants";
import { POLLUTANTS, type Pollutant } from "./types";

const PPB_PER_PPM = 1000;
const UG_PER_MG = 1000;

/** Narrows an upstream parameter name to a pollutant we track. */
export function asPollutant(name: string): Pollutant | undefined {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliased = key === "ozone" ? "o3" : key;
  return (POLLUTANTS as readonly string[]).includes(aliased) ? (aliased as Pollutant) : undefined;
}

/**
 * Converts a concentration to µg/m³. Gas ppm/ppb use the 25 °C molar volume.
 * @param pollutant - pollutant key
 * @param value - raw value
 * @param units - upstream unit string, e.g. "µg/m³", "ppm", "ppb", "mg/m³"
 * @returns µg/m³, or undefined when the unit is unknown or the value is invalid
 */
export function toUgM3(pollutant: Pollutant, value: number, units: string): number | undefined {
  if (!Number.isFinite(value) || value < 0) return undefined;
  const u = units.toLowerCase().replace(/\s/g, "");
  if (u === "µg/m³" || u === "μg/m³" || u === "ug/m3" || u === "µg/m3") return value;
  if (u === "mg/m³" || u === "mg/m3") return value * UG_PER_MG;
  if (pollutant === "pm25" || pollutant === "pm10") return undefined;
  const mw = MOLECULAR_WEIGHT[pollutant];
  if (u === "ppm") return (value * mw * UG_PER_MG) / MOLAR_VOLUME_L;
  if (u === "ppb") return (value / PPB_PER_PPM) * ((mw * UG_PER_MG) / MOLAR_VOLUME_L);
  return undefined;
}
