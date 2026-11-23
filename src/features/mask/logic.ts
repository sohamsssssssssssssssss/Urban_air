import { z } from "zod";
import { MASK_N95_FROM_AQI, MASK_OPTIONAL_FROM_AQI } from "./constants";

export const MASK_ACTIVITIES = ["indoors", "commute", "exertion"] as const;
export type MaskActivity = (typeof MASK_ACTIVITIES)[number];
export type MaskLevel = "none" | "optional" | "n95";

/** Validated input for `maskFor`. `sensitive` = child, older adult or breathing condition in the household. */
export const MaskInputSchema = z
  .object({ aqi: z.number().min(0).max(500), activity: z.enum(MASK_ACTIVITIES), sensitive: z.boolean(), child: z.boolean() })
  .strict();
export type MaskInput = z.infer<typeof MaskInputSchema>;

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
 * @throws ZodError when the input is out of range
 */
export function maskFor(input: MaskInput): MaskAdvice {
  const { aqi, activity, sensitive, child } = MaskInputSchema.parse(input);
  const outdoors = activity !== "indoors";
  const level: MaskLevel = !outdoors ? "none" : aqi >= MASK_N95_FROM_AQI ? "n95" : aqi >= MASK_OPTIONAL_FROM_AQI && sensitive ? "optional" : "none";
  const avoidExertion = activity === "exertion" && (aqi >= MASK_N95_FROM_AQI || (aqi >= MASK_OPTIONAL_FROM_AQI && sensitive));
  return { level, avoidExertion, childNote: child && level !== "none" };
}
