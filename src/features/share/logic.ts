import type { CityName } from "@/lib/cities";
import type { Language } from "@/lib/i18n";
import { totals } from "../tracker/logic";
import type { TrackerState } from "../tracker/schema";
import type { CardPeriod } from "./constants";

/** Totals shown on the weekly card, from the user's own tracker data. */
export interface WeeklyNumbers {
  trips: number;
  km: number;
  co2: number;
  pm25: number;
}

/** Totals for a period from the device's tracker state. PM2.5 is 0 when no trip had a known air level. */
export function weeklyNumbers(state: TrackerState, period: CardPeriod, now = Date.now()): WeeklyNumbers {
  const t = totals(state.trips, state.baseline, period, now);
  return { trips: t.trips, km: t.km, co2: t.co2AvoidedKg, pm25: t.pm25AvoidedUg ?? 0 };
}

const fixed = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** URL of the "today" card. The server recomputes everything from the live reading. */
export function todayCardUrl(city: CityName, lang: Language): string {
  return `/api/card?${new URLSearchParams({ kind: "today", city, lang })}`;
}

/** URL of the weekly card. Numbers are rounded to one decimal so they always match the API's number format. */
export function weeklyCardUrl(n: WeeklyNumbers, period: CardPeriod, lang: Language): string {
  return `/api/card?${new URLSearchParams({ kind: "weekly", lang, period, trips: String(n.trips), km: fixed(n.km), co2: fixed(n.co2), pm25: fixed(n.pm25) })}`;
}
