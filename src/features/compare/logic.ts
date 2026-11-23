import type { Language } from "@/lib/i18n";
import { CITIES } from "@/lib/cities";
import { COMPARE_SIMILAR_AQI_POINTS } from "./constants";
import { COMPARE_STRINGS } from "./strings";
import type { PlaceChoice } from "./schema";
import type { CompareSide } from "./server";

type Ok = Extract<CompareSide, { status: "ok" }>;

/**
 * One computed sentence comparing two places. Differences under COMPARE_SIMILAR_AQI_POINTS are reported as "similar".
 * @returns undefined unless both sides have a live reading
 */
export function compareSummary(a: CompareSide, b: CompareSide, lang: Language): string | undefined {
  if (a.status !== "ok" || b.status !== "ok") return undefined;
  const t = COMPARE_STRINGS[lang];
  const diff = Math.abs(a.aqi - b.aqi);
  if (diff < COMPARE_SIMILAR_AQI_POINTS) return t.similar({ a: a.label, b: b.label, aqiA: a.aqi, aqiB: b.aqi });
  const [clean, dirty]: [Ok, Ok] = a.aqi < b.aqi ? [a, b] : [b, a];
  return t.cleaner({ clean: clean.label, dirty: dirty.label, aqiClean: clean.aqi, aqiDirty: dirty.aqi, diff });
}

/** Request body for one side of the form. */
export function placeFromChoice(choice: PlaceChoice): { query: string } | { lat: number; lon: number; city: (typeof CITIES)[number]["name"] } {
  if (choice.kind === "text") return { query: choice.query.trim() };
  const city = CITIES.find((c) => c.name === choice.city) ?? CITIES[0];
  return { lat: city.lat, lon: city.lon, city: city.name };
}

/** A sensible starting pair: the user's city and the first different city. */
export function defaultChoices(city?: string): { a: PlaceChoice; b: PlaceChoice } {
  const first = CITIES.find((c) => c.name === city) ?? CITIES[0];
  const second = CITIES.find((c) => c.name !== first.name) ?? CITIES[1];
  return { a: { kind: "city", city: first.name }, b: { kind: "city", city: (second ?? first).name } };
}
