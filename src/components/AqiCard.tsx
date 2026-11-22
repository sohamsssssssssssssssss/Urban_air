import { POLLUTANT_LABEL } from "@/lib/aq/naqi";
import { POLLUTANTS, type AQSnapshot, type AqiCategory } from "@/lib/aq/types";
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
  "Very Poor": "bg-red-50 border-red-700",
  Severe: "bg-rose-100 border-rose-900",
};

/** Live AQI card. Announces updates politely to screen readers. */
export default function AqiCard({ state, language = "en" }: { state: AirState; language?: Language }) {
  const t = UI[language].card;
  return (
    <section aria-labelledby="aqi-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="aqi-heading" className="text-xl font-semibold">{t.heading}</h2>
      <div aria-live="polite" aria-busy={state.status === "loading"} className="mt-3">
        {state.status === "idle" && <p className="text-slate-700">{t.idle}</p>}
        {state.status === "loading" && <p className="text-slate-700">{t.loading}</p>}
        {state.status === "unavailable" && (
          <div role="alert" className="rounded-lg border-2 border-slate-500 bg-slate-100 p-4">
            <p className="font-semibold">{t.unavailableTitle}</p>
            <p className="mt-1 text-slate-800">{state.message} {t.unavailableBody}</p>
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
  const showConc = rows.some((p) => s.pollutants[p] !== undefined);
  return (
    <div>
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
          <p className="text-slate-800">{HEALTH_IMPACT[language][s.category]}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {t.meta(s.station.name, formatIST(s.measuredAt), s.source)} {t.method(POLLUTANT_LABEL[s.dominant])}
      </p>
      {s.stale && <p className="mt-2 rounded border border-amber-700 bg-amber-50 p-2 text-sm font-medium text-amber-900">{t.stale}</p>}
      <table className="mt-4 w-full max-w-md text-left text-sm">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr className="border-b border-slate-300">
            <th scope="col" className="py-1 pr-4">{t.pollutant}</th>
            {showConc && <th scope="col" className="py-1 pr-4">{t.concentration}</th>}
            <th scope="col" className="py-1">{t.subIndex}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p} className="border-b border-slate-100">
              <th scope="row" className="py-1 pr-4 font-medium">{POLLUTANT_LABEL[p]}</th>
              {showConc && <td className="py-1 pr-4 tabular-nums">{s.pollutants[p] === undefined ? "—" : Math.round(s.pollutants[p])}</td>}
              <td className="py-1 tabular-nums">{s.subIndices[p] ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
