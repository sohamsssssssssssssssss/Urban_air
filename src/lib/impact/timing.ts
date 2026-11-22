import type { HourlyPoint } from "../aq/types";
import { DEFAULT_CLEAN_WINDOW, IST_OFFSET_MINUTES, MIN_HISTORY_POINTS, WAKING_HOURS, WINDOW_HOURS } from "../constants";

export interface TimeWindow {
  start: number;
  end: number;
  /** Mean PM2.5 (µg/m³) measured in this window over the last 24 h. */
  avg?: number;
}

export interface Timing {
  best: TimeWindow;
  worst?: TimeWindow;
  /** % less PM2.5 in the best vs worst window, from measured data. Undefined when not measured. */
  reductionPct?: number;
  measured: boolean;
}

const PERCENT = 100;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/** Hour of day in IST for an ISO timestamp. */
export function istHour(iso: string): number {
  const minutes = Date.parse(iso) / 60_000 + IST_OFFSET_MINUTES;
  return Math.floor(minutes / MINUTES_PER_HOUR) % HOURS_PER_DAY;
}

/** "13:00–16:00" */
export function formatWindow(w: TimeWindow): string {
  const f = (h: number) => `${String(h % HOURS_PER_DAY).padStart(2, "0")}:00`;
  return `${f(w.start)}–${f(w.end)}`;
}

/**
 * Finds the cleanest and dirtiest WINDOW_HOURS-long windows within waking hours from the station's
 * measured last-24-hour PM2.5. This is the station's real recent pattern, not a generic curve.
 * Falls back to the documented default afternoon window (no percentage) when history is thin.
 * @param history - hourly PM2.5 points
 */
export function timingFromHistory(history: HourlyPoint[] | undefined): Timing {
  const fallback: Timing = { best: { ...DEFAULT_CLEAN_WINDOW }, measured: false };
  if (!history || history.length < MIN_HISTORY_POINTS) return fallback;

  const byHour = new Map<number, number>();
  for (const p of [...history].sort((a, b) => a.at.localeCompare(b.at))) byHour.set(istHour(p.at), p.pm25);

  const windows: TimeWindow[] = [];
  for (let start = WAKING_HOURS.start; start + WINDOW_HOURS <= WAKING_HOURS.end; start++) {
    const values = Array.from({ length: WINDOW_HOURS }, (_, i) => byHour.get(start + i)).filter((v) => v !== undefined);
    if (values.length === WINDOW_HOURS) windows.push({ start, end: start + WINDOW_HOURS, avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length) });
  }
  if (windows.length < 2) return fallback;

  const best = windows.reduce((a, b) => ((b.avg ?? 0) < (a.avg ?? 0) ? b : a));
  const worst = windows.reduce((a, b) => ((b.avg ?? 0) > (a.avg ?? 0) ? b : a));
  const reductionPct = worst.avg ? Math.round((1 - (best.avg ?? 0) / worst.avg) * PERCENT) : 0;
  return { best, worst, reductionPct, measured: true };
}
