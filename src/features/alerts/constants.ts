import { AQI_POOR, AQI_SEVERE, AQI_VERY_POOR } from "@/lib/constants";

export const ALERTS_STORAGE_KEY = "alerts";
/** How often an open app re-checks the live AQI. Stations publish hourly, so 30 minutes catches each update promptly. */
export const ALERT_POLL_MS = 30 * 60_000;
/** While the AQI stays above the threshold, notify again only after this long (or if the band gets worse). */
export const ALERT_RENOTIFY_MS = 6 * 60 * 60_000;
/** Alert levels offered: the lower edge of each CPCB band from Moderate up. */
export const ALERT_THRESHOLDS = [101, AQI_POOR, AQI_VERY_POOR, AQI_SEVERE] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];
export const SERVICE_WORKER_URL = "/sw.js";
