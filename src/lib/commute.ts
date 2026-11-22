/** Commute modes offered in onboarding (dependency-free so the client bundle stays small). */
export const COMMUTE_MODES = ["walk", "cycle", "metro", "bus", "two_wheeler", "auto", "car"] as const;
export type CommuteMode = (typeof COMMUTE_MODES)[number];
