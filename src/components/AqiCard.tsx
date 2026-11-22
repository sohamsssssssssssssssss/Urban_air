import type { AQSnapshot, AqiCategory } from "@/lib/aq/types";
import { HEALTH_IMPACT, POLLUTANT_LABEL } from "@/lib/aq/naqi";
import { POLLUTANTS } from "@/lib/aq/types";
import { formatIST } from "@/lib/format";
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
export default function AqiCard({ state }: { state: AirState }) {
  return (
    <section aria-labelledby="aqi-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="aqi-heading" className="text-xl font-semibold">Air quality now</h2>
      <div aria-live="polite" aria-busy={state.status === "loading"} className="mt-3">
        {state.status === "idle" && <p className="text-slate-700">Choose your city and household details, then select “Get my plan”.</p>}
        {state.status === "loading" && <p className="text-slate-700">Fetching the latest station reading…</p>}
        {state.status === "unavailable" && (
          <div role="alert" className="rounded-lg border-2 border-slate-500 bg-slate-100 p-4">
            <p className="font-semibold">Live data unavailable</p>
            <p className="mt-1 text-slate-800">{state.message} SmogSense never guesses pollution levels, so no advice is shown. Please try again in a few minutes.</p>
          </div>
        )}
        {state.status === "ready" && <Reading snapshot={state.snapshot} />}
      </div>
    </section>
  );
}

function Reading({ snapshot: s }: { snapshot: AQSnapshot }) {
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
            {s.category}
          </p>
          <p className="text-slate-800">{HEALTH_IMPACT[s.category]}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {s.station.name} · measured {formatIST(s.measuredAt)} · source {s.source}. NAQI estimate from the latest hourly readings; main pollutant {POLLUTANT_LABEL[s.dominant]}.
      </p>
      {s.stale && (
        <p className="mt-2 rounded border border-amber-700 bg-amber-50 p-2 text-sm font-medium text-amber-900">
          Heads up: this reading is more than 3 hours old. The station may be delayed.
        </p>
      )}
      <table className="mt-4 w-full max-w-md text-left text-sm">
        <caption className="sr-only">Pollutant concentrations</caption>
        <thead>
          <tr className="border-b border-slate-300">
            <th scope="col" className="py-1 pr-4">Pollutant</th>
            <th scope="col" className="py-1">Concentration (µg/m³)</th>
          </tr>
        </thead>
        <tbody>
          {POLLUTANTS.filter((p) => s.pollutants[p] !== undefined).map((p) => (
            <tr key={p} className="border-b border-slate-100">
              <th scope="row" className="py-1 pr-4 font-medium">{POLLUTANT_LABEL[p]}</th>
              <td className="py-1 tabular-nums">{Math.round(s.pollutants[p] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
