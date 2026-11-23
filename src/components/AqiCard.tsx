import { POLLUTANT_LABEL } from "@/lib/aq/naqi";
import { POLLUTANTS, type AQSnapshot, type AqiCategory } from "@/lib/aq/types";
import { formatConcentration } from "@/lib/aq/units";
import { formatIST } from "@/lib/format";
import { CATEGORY_LABEL, HEALTH_IMPACT, UI, type Language } from "@/lib/i18n";
import CategoryIcon from "./CategoryIcon";

export type AirState = { status: "idle" } | { status: "loading" } | { status: "ready"; snapshot: AQSnapshot } | { status: "unavailable"; message: string };

/** Pale background + dark text keeps WCAG AA contrast; the border carries the CPCB colour. */
const CATEGORY_STYLE: Record<AqiCategory, string> = {
  Good: "bg-green-50 border-green-700",
  Satisfactory: "bg-lime-50 border-lime-700",
  Moderate: "bg-yellow-50 border-yellow-600",
  Poor: "bg-orange-50 border-orange-600",
  "Very Poor": "bg-danger-soft border-danger",
  Severe: "bg-rose-100 border-rose-900",
};

/** Live AQI card. Announces updates politely to screen readers. */
export default function AqiCard({ state, language = "en" }: { state: AirState; language?: Language }) {
  const t = UI[language].card;
  return (
    <section aria-labelledby="aqi-heading" className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 id="aqi-heading" className="text-xl font-semibold">{t.heading}</h2>
      <div aria-live="polite" aria-busy={state.status === "loading"} className="mt-3">
        {state.status === "idle" && <p className="text-ink-muted">{t.idle}</p>}
        {state.status === "loading" && <p className="text-ink-muted">{t.loading}</p>}
        {state.status === "unavailable" && (
          <div role="alert" className="rounded-lg border-2 border-line-strong bg-sunken p-4">
            <p className="font-semibold">{t.unavailableTitle}</p>
            <p className="mt-1 text-ink">{state.message} {t.unavailableBody}</p>
          </div>
        )}
        {state.status === "ready" && <Reading snapshot={state.snapshot} language={language} />}
      </div>
    </section>
  );
}

function Reading({ snapshot: s, language }: { snapshot: AQSnapshot; language: Language }) {
  const t = UI[language].card;
  const rows = POLLUTANTS.filter((p) => s.subIndices[p] !== undefined || s.pollutants[p] !== undefined);
  const missing = s.source === "CPCB" ? t.subIndexOnly : t.notReported;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{s.provisional ? t.provisional : t.aqiMethod}</p>
      <div className={`flex flex-wrap items-center gap-4 rounded-lg border-l-8 p-4 ${CATEGORY_STYLE[s.category]}`}>
        <p className="text-5xl font-bold tabular-nums">
          <span className="sr-only">AQI </span>
          {s.aqi}
        </p>
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold">
            <CategoryIcon category={s.category} />
            {CATEGORY_LABEL[language][s.category]}
          </p>
          <p className="text-ink">{HEALTH_IMPACT[language][s.category]}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        {t.meta(s.station.name, formatIST(s.measuredAt), s.source)} {t.dominant(POLLUTANT_LABEL[s.dominant])}
      </p>
      {s.provisional && <p className="mt-2 text-sm text-warn-text">{t.provisionalDetail}</p>}
      {s.sensorType === "low-cost" && <p className="mt-2 text-sm text-ink-muted">{t.lowCost}</p>}
      <p className="mt-3 text-sm text-ink">
        <strong>{t.lastHour}</strong>{" · "}
        {s.pollutants.pm25 !== undefined
          ? `${Math.round(s.pollutants.pm25)} µg/m³ · ${formatIST(s.pm25MeasuredAt ?? s.measuredAt)}`
          : t.noHourlyPm25}
      </p>
      {s.stale && <p className="mt-2 rounded border border-warn bg-warn-soft p-2 text-sm font-medium text-warn-text">{t.stale}</p>}
      <table className="mt-4 w-full max-w-md text-left text-sm">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-1 pr-4">{t.pollutant}</th>
            <th scope="col" className="py-1 pr-4">{t.concentration}</th>
            <th scope="col" className="py-1">{t.subIndex}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p} className="border-b border-line">
              <th scope="row" className="py-1 pr-4 font-medium">{POLLUTANT_LABEL[p]}</th>
              <td className="py-1 pr-4 tabular-nums">{s.pollutants[p] === undefined ? <NotAvailable label={t.notAvailable} text={missing} /> : formatConcentration(p, s.pollutants[p])}</td>
              <td className="py-1 tabular-nums">{s.subIndices[p] ?? <NotAvailable label={t.notAvailable} text={missing} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some((p) => s.pollutants[p] === undefined) && <p className="mt-2 text-xs text-ink-muted">{missing}</p>}
    </div>
  );
}

/** "n/a" with the reason as a hover tooltip and as screen-reader text (the visible footnote covers touch devices). */
function NotAvailable({ label, text }: { label: string; text: string }) {
  return (
    <span title={text}>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
