import type { Language } from "@/lib/i18n";
import type { CommuteMode } from "@/lib/commute";
import { totals, type Period } from "./logic";
import type { Trip } from "./schema";
import { TRACKER_STRINGS } from "./strings";

const PERIODS: Period[] = ["week", "month", "all"];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Weekly, monthly and all-time totals against the baseline mode. All figures are estimates. */
export default function TrackerSummary({ trips, baseline, language }: { trips: Trip[]; baseline: CommuteMode; language: Language }) {
  const t = TRACKER_STRINGS[language];
  return (
    <ul className="mt-4 grid gap-3 md:grid-cols-3">
      {PERIODS.map((period) => {
        const x = totals(trips, baseline, period);
        return (
          <li key={period} className="rounded-control border border-line p-3">
            <h3 className="font-semibold">{t.periods[period]}</h3>
            <p className="text-sm text-ink-muted">{t.trips(x.trips)} · {t.distance(r1(x.km))}</p>
            <p className="mt-1 font-semibold">{x.co2AvoidedKg >= 0 ? t.co2Avoided(r1(x.co2AvoidedKg)) : t.co2Extra(r1(-x.co2AvoidedKg))}</p>
            <p className="text-sm">{x.pm25AvoidedUg === null ? t.pmUnknown : x.pm25AvoidedUg >= 0 ? t.pmAvoided(r1(x.pm25AvoidedUg)) : t.pmExtra(r1(-x.pm25AvoidedUg))}</p>
          </li>
        );
      })}
    </ul>
  );
}
