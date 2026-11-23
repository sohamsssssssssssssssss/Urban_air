import { CO2_KG_PER_PKM } from "@/lib/constants";
import type { CommuteMode } from "@/lib/commute";
import { tripDose } from "@/lib/impact/exposure";
import { istDayKey } from "../shared/storage";
import { MAX_TRIPS } from "./constants";
import { TripSchema, type Trip, type TrackerState } from "./schema";

export interface TripImpact {
  co2Kg: number;
  /** Positive = emitted less than the baseline mode would have. */
  co2AvoidedKg: number;
  pm25Ug: number | null;
  /** Positive = inhaled less than on the baseline mode (estimate). */
  pm25AvoidedUg: number | null;
}

/**
 * CO₂ and estimated PM2.5 inhaled for one trip, against what the baseline mode would have been on the same
 * distance at the same ambient PM2.5. PM2.5 uses the trip-dose model (in-mode ratio × breathing rate × time);
 * it is an estimate, and null when the ambient level was not known.
 */
export function tripImpact(trip: Trip, baseline: CommuteMode): TripImpact {
  const co2Kg = CO2_KG_PER_PKM[trip.mode] * trip.km;
  const dose = (mode: CommuteMode) => (trip.ambientUgm3 === null ? null : tripDose(mode, trip.km) * trip.ambientUgm3);
  const actual = dose(trip.mode);
  const base = dose(baseline);
  return { co2Kg, co2AvoidedKg: CO2_KG_PER_PKM[baseline] * trip.km - co2Kg, pm25Ug: actual, pm25AvoidedUg: actual === null || base === null ? null : base - actual };
}

export interface Totals {
  trips: number;
  km: number;
  co2AvoidedKg: number;
  /** Null when no trip in the period had a known ambient level. */
  pm25AvoidedUg: number | null;
}

export type Period = "week" | "month" | "all";

/** Monday of the week containing a `YYYY-MM-DD` date. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Whether a trip falls in the current week (Mon-Sun), month, or ever, in India time. */
export function inPeriod(trip: Trip, period: Period, today: string): boolean {
  if (period === "all") return true;
  return period === "month" ? trip.date.slice(0, 7) === today.slice(0, 7) : weekStart(trip.date) === weekStart(today);
}

/** Totals for a period. */
export function totals(trips: Trip[], baseline: CommuteMode, period: Period, now = Date.now()): Totals {
  const today = istDayKey(now);
  const inRange = trips.filter((t) => inPeriod(t, period, today));
  const impacts = inRange.map((t) => tripImpact(t, baseline));
  const known = impacts.filter((i) => i.pm25AvoidedUg !== null);
  return {
    trips: inRange.length,
    km: inRange.reduce((a, t) => a + t.km, 0),
    co2AvoidedKg: impacts.reduce((a, i) => a + i.co2AvoidedKg, 0),
    pm25AvoidedUg: known.length === 0 ? null : known.reduce((a, i) => a + (i.pm25AvoidedUg ?? 0), 0),
  };
}

export type AddResult = { ok: true; state: TrackerState } | { ok: false; error: "invalid" | "future" };

/** Adds a validated trip (newest first); a date in the future is rejected, and the oldest trips drop beyond the cap. */
export function addTrip(state: TrackerState, input: Omit<Trip, "id">, id: string, now = Date.now()): AddResult {
  const parsed = TripSchema.safeParse({ ...input, id });
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.date > istDayKey(now)) return { ok: false, error: "future" };
  return { ok: true, state: { ...state, trips: [parsed.data, ...state.trips].slice(0, MAX_TRIPS) } };
}

export function removeTrip(state: TrackerState, id: string): TrackerState {
  return { ...state, trips: state.trips.filter((t) => t.id !== id) };
}

const csvCell = (value: string | number | null): string => {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV of every trip with its computed impact (values are enums and numbers only, so nothing can inject a formula). */
export function toCsv(state: TrackerState): string {
  const header = ["date", "mode", "km", "source", "ambient_pm25_ugm3", "co2_kg", "baseline_mode", "co2_avoided_kg", "pm25_inhaled_ug_est", "pm25_avoided_ug_est"];
  const round = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);
  const rows = state.trips.map((t) => {
    const i = tripImpact(t, state.baseline);
    return [t.date, t.mode, t.km, t.source, t.ambientUgm3, round(i.co2Kg), state.baseline, round(i.co2AvoidedKg), round(i.pm25Ug), round(i.pm25AvoidedUg)].map(csvCell).join(",");
  });
  return [header.join(","), ...rows].join("\n") + "\n";
}
