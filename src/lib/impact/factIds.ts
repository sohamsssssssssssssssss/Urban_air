/**
 * Every tip id `buildFacts` can produce. It is the closed list the feedback API accepts, so arbitrary text can never
 * reach the logs. A test checks it matches `buildFacts` exactly (nothing missing, nothing unreachable).
 */
export const FACT_IDS = [
  "outdoor_timing",
  "commute_overlap",
  "n95_mask",
  "exercise_indoors",
  "commute_exposure",
  "purifier",
  "ventilation_timing",
  "cooking_exhaust",
  "no_indoor_smoke",
  "plants_reality",
  "transit_switch",
  "carpool",
  "wfh_day",
  "active_short_trips",
  "no_burning",
] as const;
export type FactId = (typeof FACT_IDS)[number];
