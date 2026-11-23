import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getAirQuality } from "@/lib/aq";
import { CITIES } from "@/lib/cities";
import { formatIST } from "@/lib/format";
import { formatWindow, timingFromHistory } from "@/lib/impact/timing";
import { maskFor } from "../mask/logic";
import { todayCard, weeklyCard } from "./cardElements";
import { CARD_FONT_FAMILY, CARD_HEIGHT, CARD_WIDTH, TODAY_CARD_CACHE_S, WEEKLY_CARD_CACHE_S } from "./constants";
import type { CardQuery } from "./schema";

const FONT_DIR = path.join(process.cwd(), "src/features/share/fonts");
let fonts: Promise<Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }>> | undefined;

/** Noto Sans Devanagari (SIL OFL), subsetted to Latin + Devanagari. Read once per instance. */
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(FONT_DIR, "NotoSansDevanagari-Regular.ttf")),
    readFile(path.join(FONT_DIR, "NotoSansDevanagari-Bold.ttf")),
  ]).then(([regular, bold]) => [
    { name: CARD_FONT_FAMILY, data: regular, weight: 400 as const, style: "normal" as const },
    { name: CARD_FONT_FAMILY, data: bold, weight: 700 as const, style: "normal" as const },
  ]);
  fonts.catch(() => (fonts = undefined)); // retry next time if the read failed
  return fonts;
}

/**
 * Renders the share card as a 1200x630 PNG.
 * - "today": recomputed here from the live reading for the chosen city (not forgeable); no profile is used.
 * - "weekly": the numbers come from the user's own device, validated and bounded by the schema.
 * @throws AQUnavailableError for "today" when there is no live data
 */
export async function renderCard(query: CardQuery): Promise<ImageResponse> {
  const options = { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: await loadFonts() };
  if (query.kind === "weekly") {
    return new ImageResponse(weeklyCard(query, query.lang), { ...options, headers: { "Cache-Control": `private, max-age=${WEEKLY_CARD_CACHE_S}` } });
  }
  const city = CITIES.find((c) => c.name === query.city) ?? CITIES[0];
  const snapshot = await getAirQuality({ lat: city.lat, lon: city.lon, city: city.name });
  const timing = timingFromHistory(snapshot.history);
  const mask = maskFor({ aqi: snapshot.aqi, activity: "commute", sensitive: false, child: false }).level;
  const data = { city: city.name, aqi: snapshot.aqi, category: snapshot.category, window: formatWindow(timing.best), windowMeasured: timing.measured, mask, station: snapshot.station.name, time: formatIST(snapshot.measuredAt), source: snapshot.source };
  return new ImageResponse(todayCard(data, query.lang), { ...options, headers: { "Cache-Control": `public, max-age=${TODAY_CARD_CACHE_S}, s-maxage=${TODAY_CARD_CACHE_S}` } });
}
