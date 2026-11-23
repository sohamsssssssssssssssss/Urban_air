import { categoryFor } from "@/lib/aq/naqi";
import { CATEGORIES } from "@/lib/aq/types";
import { ALERT_RENOTIFY_MS } from "./constants";
import type { AlertSettings } from "./schema";

/** Index of the CPCB band an AQI falls in (0 = Good ... 5 = Severe). */
export const bandOf = (aqi: number): number => CATEGORIES.indexOf(categoryFor(aqi));

export interface Evaluation {
  /** Show a browser notification now. */
  notify: boolean;
  /** The reading is at or above the threshold (drives the in-app banner). */
  above: boolean;
  lastNotified: AlertSettings["lastNotified"];
}

/**
 * Decides what a new reading means for the user's alert.
 * - Below the threshold: no alert, and the memory is cleared so the next crossing notifies again.
 * - At or above: notify on the first crossing, when the band gets worse, or after the cooldown; otherwise stay quiet.
 * @param settings - the saved alert settings
 * @param aqi - the latest AQI
 * @param now - clock
 */
export function evaluateReading(settings: Pick<AlertSettings, "threshold" | "lastNotified">, aqi: number, now: number): Evaluation {
  if (aqi < settings.threshold) return { notify: false, above: false, lastNotified: null };
  const last = settings.lastNotified;
  const notify = last === null || bandOf(aqi) > bandOf(last.aqi) || now - last.at >= ALERT_RENOTIFY_MS;
  return { notify, above: true, lastNotified: notify ? { at: now, aqi } : last };
}
