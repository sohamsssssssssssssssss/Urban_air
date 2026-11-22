import {
  DIURNAL_FACTOR,
  INFILTRATION_ACH,
  INHALATION_M3H,
  MODE_ACTIVITY,
  MODE_EXPOSURE_RATIO,
  PM25_DEPOSITION_PER_H,
  ROOM_VOLUME_M3,
  SPEED_KMH,
} from "../constants";
import type { CommuteMode } from "../profile";

const PERCENT = 100;

/**
 * Relative inhaled PM2.5 dose for one trip: in-mode concentration ratio × breathing rate × time.
 * Multiply by ambient PM2.5 (µg/m³) to get µg inhaled.
 */
export function tripDose(mode: CommuteMode, km: number): number {
  return MODE_EXPOSURE_RATIO[mode] * INHALATION_M3H[MODE_ACTIVITY[mode]] * (km / SPEED_KMH[mode]);
}

/**
 * Percent change in inhaled dose when switching modes for the same distance.
 * @returns integer percent; negative means less exposure
 */
export function modeDoseChangePct(from: CommuteMode, to: CommuteMode, km: number): number {
  const base = tripDose(from, km);
  return base === 0 ? 0 : Math.round(((tripDose(to, km) - base) / base) * PERCENT);
}

/** Percent less PM2.5 met outdoors in the afternoon window vs the morning peak (typical winter day). */
export function timingReductionPct(): number {
  return Math.round((1 - DIURNAL_FACTOR.afternoon / DIURNAL_FACTOR.morningPeak) * PERCENT);
}

/**
 * Steady-state indoor PM2.5 reduction from running an air cleaner, single-zone mass balance:
 * C_in ∝ P·a / (a + k + CADR/V)  ⇒  reduction = 1 − (a + k) / (a + k + CADR/V).
 * @param cadrM3h - clean air delivery rate
 * @param volumeM3 - room volume
 */
export function purifierReductionPct(cadrM3h: number, volumeM3 = ROOM_VOLUME_M3, ach = INFILTRATION_ACH, deposition = PM25_DEPOSITION_PER_H): number {
  const losses = ach + deposition;
  return Math.round((1 - losses / (losses + cadrM3h / volumeM3)) * PERCENT);
}

/** How many times more air is inhaled during moderate exercise than at rest. */
export function exerciseDoseMultiplier(): number {
  return Math.round((INHALATION_M3H.moderate / INHALATION_M3H.rest) * 10) / 10;
}
