import { CARPOOL_OCCUPANCY, CO2_KG_PER_PKM, OPEN_BURNING_PM25_G_PER_KG, TRIPS_PER_DAY, WEEKS_PER_YEAR, WORK_DAYS_PER_WEEK } from "../constants";
import type { CommuteMode } from "../profile";

/** Rounds to one decimal place for display. */
export const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * CO2 for one commuter's working week (two trips a day, five days).
 * @param mode - commute mode
 * @param oneWayKm - one-way distance
 * @returns kg CO2 per week
 */
export function weeklyCommuteCo2Kg(mode: CommuteMode, oneWayKm: number): number {
  return CO2_KG_PER_PKM[mode] * oneWayKm * TRIPS_PER_DAY * WORK_DAYS_PER_WEEK;
}

export interface Savings {
  weeklyKg: number;
  yearlyKg: number;
}

const toSavings = (weeklyKg: number): Savings => ({ weeklyKg: round1(weeklyKg), yearlyKg: Math.round(weeklyKg * WEEKS_PER_YEAR) });

/**
 * CO2 saved by switching commute mode (negative if the new mode emits more).
 */
export function modeSwitchSavings(from: CommuteMode, to: CommuteMode, oneWayKm: number): Savings {
  return toSavings(weeklyCommuteCo2Kg(from, oneWayKm) - weeklyCommuteCo2Kg(to, oneWayKm));
}

/** CO2 saved per person by sharing a car with CARPOOL_OCCUPANCY people. */
export function carpoolSavings(oneWayKm: number): Savings {
  const solo = weeklyCommuteCo2Kg("car", oneWayKm);
  return toSavings(solo - solo / CARPOOL_OCCUPANCY);
}

/** CO2 saved by working from home one day a week. */
export function wfhDaySavings(mode: CommuteMode, oneWayKm: number): Savings {
  return toSavings(weeklyCommuteCo2Kg(mode, oneWayKm) / WORK_DAYS_PER_WEEK);
}

/** PM2.5 (grams) released by openly burning a mass of leaves or residue. */
export function openBurningPm25Grams(kg: number): number {
  return Math.round(kg * OPEN_BURNING_PM25_G_PER_KG);
}
