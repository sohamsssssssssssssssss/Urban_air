import type { HourlyPoint } from "@/lib/aq/types";

export interface SparkPoint {
  x: number;
  y: number;
}

/**
 * Scales hourly values into SVG coordinates (y grows downward, so higher PM2.5 is higher on screen).
 * @returns the points, or [] when fewer than 2 values exist
 */
export function sparklinePoints(values: number[], width: number, height: number, pad = 4): SparkPoint[] {
  if (values.length < 2) return [];
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return values.map((v, i) => ({ x: pad + (i / (values.length - 1)) * (width - 2 * pad), y: height - pad - ((v - min) / span) * (height - 2 * pad) }));
}

/** Lowest and highest reading in the history (the text alternative for the sparkline). */
export function historyExtremes(history: HourlyPoint[]): { low: HourlyPoint; high: HourlyPoint } | null {
  if (history.length === 0) return null;
  return { low: history.reduce((a, b) => (b.pm25 < a.pm25 ? b : a)), high: history.reduce((a, b) => (b.pm25 > a.pm25 ? b : a)) };
}

/** "14:30" in India time. */
export function clockIST(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}
