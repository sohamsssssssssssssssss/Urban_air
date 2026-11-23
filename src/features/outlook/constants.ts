import { HOUR_MS } from "@/lib/constants";

/** Open-Meteo Air Quality API (free, no key). Data are CAMS model output (CAMS Global over India), not measurements. */
export const OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
export const OUTLOOK_HOURS = 48;
/** Forecast runs update a few times a day, so an hour is a safe cache lifetime. */
export const OUTLOOK_CACHE_TTL_MS = HOUR_MS;
export const OUTLOOK_WINDOWS = 3;
export const OUTLOOK_TIMEZONE = "Asia/Kolkata";
