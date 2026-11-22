import { MODE_NAME, UI, type Language } from "@/lib/i18n";
import { ROUTE_UI } from "@/lib/i18n.route";
import type { RouteResult } from "@/lib/route";
import type { ScoredRoute } from "@/lib/route/types";

/** Route cards (Cleanest / Fastest / Best balance) and the full alternatives table. Everything is labelled "estimated". */
export default function RouteResults({ result, language }: { result: RouteResult; language: Language }) {
  const t = ROUTE_UI[language];
  const names = MODE_NAME[language];
  const stats = (r: ScoredRoute) => [
    [t.duration, `${r.durationMin} ${t.min}`],
    [t.distance, `${r.distanceKm} ${t.km}`],
    [t.pm25, `${r.pm25Ug} ${t.ug}`],
    [t.co2, `${r.co2Kg} ${t.kg}`],
  ] as const;

  return (
    <div className="mt-4">
      <p className="text-sm text-slate-800">{t.estimatedNote} {t.basis[result.air.basis](result.air.station)}</p>
      {result.approximate && <p className="mt-2 rounded border border-amber-700 bg-amber-50 p-2 text-sm font-medium text-amber-900">{t.approximate}</p>}
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {result.cards.map(({ route, labels, reason }) => (
          <li key={route.id} className="rounded-lg border border-slate-300 p-4">
            <p className="flex flex-wrap gap-2">
              {labels.map((label) => <span key={label} className="rounded border border-blue-800 px-2 py-0.5 text-xs font-semibold text-blue-900">{t.labels[label]}</span>)}
            </p>
            <h3 className="mt-2 text-lg font-semibold">{names[route.mode][0]?.toUpperCase() + names[route.mode].slice(1)}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {stats(route).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-700">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm">{reason}</p>
          </li>
        ))}
      </ul>
      {result.reasonsBy === "computed" && result.fallbackReason && <p className="mt-2 text-xs text-slate-700">{t.computedNote(UI[language].plan.aiReasons[result.fallbackReason])}</p>}
      {result.unavailableModes.length > 0 && <p className="mt-2 text-sm text-slate-800">{t.noneFor(result.unavailableModes.map((m) => names[m]).join(", "))}</p>}

      <table className="mt-4 w-full text-left text-sm">
        <caption className="mb-1 text-left font-semibold">{t.tableCaption}</caption>
        <thead>
          <tr className="border-b border-slate-300">
            {[t.mode, t.route, t.duration, t.distance, t.pm25, t.co2, t.roads].map((h) => <th key={h} scope="col" className="py-1 pr-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.modes.flatMap((m) => m.routes.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 align-top">
              <th scope="row" className="py-1 pr-3 font-medium">{names[r.mode]}</th>
              <td className="py-1 pr-3 tabular-nums">#{r.alt}</td>
              <td className="py-1 pr-3 tabular-nums">{r.durationMin} {t.min}</td>
              <td className="py-1 pr-3 tabular-nums">{r.distanceKm} {t.km}</td>
              <td className="py-1 pr-3 tabular-nums">{r.pm25Ug} {t.ug}</td>
              <td className="py-1 pr-3 tabular-nums">{r.co2Kg} {t.kg}</td>
              <td className="py-1 text-xs">{r.roadAdjustment === "applied" ? t.roadApplied(Math.round(r.majorShare * 100)) : t.roadNot}</td>
            </tr>
          )))}
        </tbody>
      </table>
      {result.modes.some((m) => m.mode === "two_wheeler") && <p className="mt-2 text-xs text-slate-700">{t.twoWheelerNote}</p>}
      <p className="mt-2 text-xs text-slate-700">{t.attribution}</p>
    </div>
  );
}
