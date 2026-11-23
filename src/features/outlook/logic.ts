import { categoryFor, subIndex } from "@/lib/aq/naqi";
import type { AqiCategory } from "@/lib/aq/types";
import { WAKING_HOURS, WINDOW_HOURS } from "@/lib/constants";
import { OUTLOOK_WINDOWS } from "./constants";

/** One forecast hour. `at` is an ISO instant; `pm25`/`pm10` are µg/m³ or null when the model has no value. */
export interface ForecastHour {
  at: string;
  pm25: number | null;
  pm10: number | null;
}

/** The part of Open-Meteo's response we use (validated by Zod on the server). */
export interface OpenMeteoHourly {
  time: string[];
  pm2_5: Array<number | null>;
  pm10: Array<number | null>;
}

export interface ForecastWindow {
  rank: number;
  /** ISO instants. */
  start: string;
  end: string;
  /** Mean forecast PM2.5 over the window, µg/m³. */
  avgPm25: number;
  /** CPCB category from PM2.5 alone (an approximation of the AQI, not the official index). */
  category: AqiCategory;
}

const HOUR_MS = 3_600_000;
const IST_OFFSET_MS = 330 * 60_000;

/** Converts Open-Meteo's local-time strings ("2026-11-23T10:00", Asia/Kolkata) to instants. */
export function parseForecast(h: OpenMeteoHourly): ForecastHour[] {
  return h.time.flatMap((time, i) => {
    const at = Date.parse(`${time}:00+05:30`);
    return Number.isFinite(at) ? [{ at: new Date(at).toISOString(), pm25: h.pm2_5[i] ?? null, pm10: h.pm10[i] ?? null }] : [];
  });
}

const istHour = (iso: string) => new Date(Date.parse(iso) + IST_OFFSET_MS).getUTCHours();

/**
 * The cleanest non-overlapping windows in the forecast, ranked by mean PM2.5.
 * A window is WINDOW_HOURS consecutive hours that all have a value and fall within waking hours (IST),
 * so "cleanest" never means 3 a.m.
 * @param hours - forecast hours
 * @param count - how many windows to return
 */
export function cleanestWindows(hours: ForecastHour[], count = OUTLOOK_WINDOWS): ForecastWindow[] {
  const candidates: Array<{ start: number; avg: number }> = [];
  for (let i = 0; i + WINDOW_HOURS <= hours.length; i++) {
    const slice = hours.slice(i, i + WINDOW_HOURS);
    const consecutive = slice.every((p, k) => Date.parse(p.at) === Date.parse((slice[0] as ForecastHour).at) + k * HOUR_MS);
    const startHour = istHour((slice[0] as ForecastHour).at);
    // Compare on the start hour: the last hour of a window starting at 23:00 wraps to 01:00 and would slip through.
    const inWaking = startHour >= WAKING_HOURS.start && startHour + WINDOW_HOURS <= WAKING_HOURS.end;
    const values = slice.map((p) => p.pm25);
    if (consecutive && inWaking && values.every((v): v is number => v !== null)) candidates.push({ start: i, avg: values.reduce((a, b) => a + b, 0) / WINDOW_HOURS });
  }
  const chosen: typeof candidates = [];
  for (const c of [...candidates].sort((a, b) => a.avg - b.avg || a.start - b.start)) {
    if (chosen.length < count && chosen.every((o) => Math.abs(o.start - c.start) >= WINDOW_HOURS)) chosen.push(c);
  }
  return chosen.map((c, i) => {
    const first = hours[c.start] as ForecastHour;
    return {
      rank: i + 1,
      start: first.at,
      end: new Date(Date.parse(first.at) + WINDOW_HOURS * HOUR_MS).toISOString(),
      avgPm25: Math.round(c.avg * 10) / 10,
      category: categoryFor(subIndex("pm25", c.avg)),
    };
  });
}

/** Highest and lowest forecast hours, for the chart's text alternative. */
export function extremes(hours: ForecastHour[]): { peak: ForecastHour; low: ForecastHour } | null {
  const known = hours.filter((h): h is ForecastHour & { pm25: number } => h.pm25 !== null);
  if (known.length === 0) return null;
  return { peak: known.reduce((a, b) => (b.pm25 > a.pm25 ? b : a)), low: known.reduce((a, b) => (b.pm25 < a.pm25 ? b : a)) };
}

const LOCALE = { en: "en-IN", hi: "hi-IN" } as const;

/** "Mon 24 Nov, 14:00" in India time. */
export function formatWhen(iso: string, lang: keyof typeof LOCALE): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

/** "Mon 24 Nov, 14:00–17:00" in India time. */
export function formatWindowWhen(w: Pick<ForecastWindow, "start" | "end">, lang: keyof typeof LOCALE): string {
  const end = new Intl.DateTimeFormat(LOCALE[lang], { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date(w.end));
  return `${formatWhen(w.start, lang)}–${end}`;
}
