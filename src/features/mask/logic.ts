import { MASK_N95_FROM_AQI, MASK_OPTIONAL_FROM_AQI } from "./constants";

export const MASK_ACTIVITIES = ["indoors", "commute", "exertion"] as const;
export type MaskActivity = (typeof MASK_ACTIVITIES)[number];
export type MaskLevel = "none" | "optional" | "n95";

/** Input for `maskFor`. `sensitive` = child, older adult or breathing condition in the household. */
export interface MaskInput {
  aqi: number;
  activity: MaskActivity;
  sensitive: boolean;
  child: boolean;
}
const MAX_AQI = 500;

export interface MaskAdvice {
  level: MaskLevel;
  /** Outdoor physical exertion should be avoided or kept short (MoHFW/CPCB statements for Moderate and worse air). */
  avoidExertion: boolean;
  /** Show the "N95s are not approved for children" note. */
  childNote: boolean;
}

/**
 * Which mask, if any, for an AQI band and activity.
 * - AQI 201+ (Poor to Severe): close-fitted N95/N99 outdoors (MoHFW advisory).
 * - AQI 101-200 (Moderate): optional, mainly for sensitive people (CPCB: discomfort in vulnerable groups).
 * - Below 101, or staying indoors: none.
 * Surgical, paper and cloth masks are never recommended for PM2.5 (MoHFW: "not effective").
 * @throws RangeError when the AQI is not a number from 0 to 500
 */
export function maskFor(input: MaskInput): MaskAdvice {
  const { aqi, activity, sensitive, child } = input;
  // Plain guard instead of Zod: this runs in the first-load client bundle, where Zod would cost ~30 kB.
  if (!Number.isFinite(aqi) || aqi < 0 || aqi > MAX_AQI) throw new RangeError("aqi must be between 0 and 500");
  const outdoors = activity !== "indoors";
  const level: MaskLevel = !outdoors ? "none" : aqi >= MASK_N95_FROM_AQI ? "n95" : aqi >= MASK_OPTIONAL_FROM_AQI && sensitive ? "optional" : "none";
  const avoidExertion = activity === "exertion" && (aqi >= MASK_N95_FROM_AQI || (aqi >= MASK_OPTIONAL_FROM_AQI && sensitive));
  return { level, avoidExertion, childNote: child && level !== "none" };
}
