import "server-only";
import { z } from "zod";
import { createTtlCache } from "@/lib/cache";
import { COORD_CACHE_DECIMALS } from "@/lib/constants";
import { ForecastUnavailableError, UpstreamError } from "@/lib/errors";
import { fetchJson } from "@/lib/fetchJson";
import { OPEN_METEO_URL, OUTLOOK_CACHE_TTL_MS, OUTLOOK_HOURS, OUTLOOK_TIMEZONE } from "./constants";
import { cleanestWindows, parseForecast, type ForecastHour, type ForecastWindow } from "./logic";

const ResponseSchema = z.object({
  hourly: z.object({ time: z.array(z.string()), pm2_5: z.array(z.number().nullable()), pm10: z.array(z.number().nullable()) }),
});

export interface Outlook {
  hours: ForecastHour[];
  windows: ForecastWindow[];
  /** Always the CAMS model via Open-Meteo: a forecast, not a measurement. */
  source: "Open-Meteo (CAMS)";
}

const cache = createTtlCache<Outlook>(OUTLOOK_CACHE_TTL_MS);

/**
 * Next 48 h of forecast PM2.5/PM10 for a place, with the three cleanest windows. Cached for 1 hour per ~1 km cell.
 * @throws ForecastUnavailableError when Open-Meteo fails, times out, or returns no usable hours
 */
export function getOutlook(lat: number, lon: number): Promise<Outlook> {
  const key = `${lat.toFixed(COORD_CACHE_DECIMALS)},${lon.toFixed(COORD_CACHE_DECIMALS)}`;
  return cache.getOrLoad(key, async () => {
    const query = new URLSearchParams({ latitude: String(lat), longitude: String(lon), hourly: "pm2_5,pm10", timezone: OUTLOOK_TIMEZONE, forecast_hours: String(OUTLOOK_HOURS) });
    let data: z.infer<typeof ResponseSchema>;
    try {
      data = await fetchJson("Open-Meteo", `${OPEN_METEO_URL}?${query}`, ResponseSchema);
    } catch (err) {
      if (err instanceof UpstreamError) throw new ForecastUnavailableError();
      throw err;
    }
    const hours = parseForecast(data.hourly);
    if (!hours.some((h) => h.pm25 !== null)) throw new ForecastUnavailableError();
    return { hours, windows: cleanestWindows(hours), source: "Open-Meteo (CAMS)" };
  });
}
