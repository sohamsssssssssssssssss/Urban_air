import CategoryIcon from "@/components/CategoryIcon";
import { POLLUTANT_LABEL } from "@/lib/aq/naqi";
import { formatIST } from "@/lib/format";
import { CATEGORY_LABEL, type Language } from "@/lib/i18n";
import { COMPARE_STRINGS } from "./strings";
import type { CompareSide } from "./server";

/** One side of the comparison: AQI as number + icon + category text (never colour alone). */
export default function CompareCard({ side, language }: { side: CompareSide; language: Language }) {
  const t = COMPARE_STRINGS[language];
  return (
    <li className="rounded-lg border border-slate-300 p-4">
      <h3 className="text-lg font-semibold">{side.label}</h3>
      {side.status === "unavailable" ? (
        <p role="alert" className="mt-2 rounded border border-slate-500 bg-slate-100 p-2 text-sm">{t.sideError[side.code]}</p>
      ) : (
        <>
          <p className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-4xl font-bold tabular-nums"><span className="sr-only">{t.aqi} </span>{side.aqi}</span>
            <span className="flex items-center gap-2 font-semibold"><CategoryIcon category={side.category} />{CATEGORY_LABEL[language][side.category]}</span>
          </p>
          <dl className="mt-2 grid gap-1 text-sm">
            <div><dt className="inline font-semibold">{t.dominant}: </dt><dd className="inline">{POLLUTANT_LABEL[side.dominant]}</dd></div>
            <div><dt className="inline font-semibold">{t.bestWindow}: </dt><dd className="inline">{side.windowMeasured ? "" : `${t.windowUsual} `}{side.bestWindow}</dd></div>
            <div><dt className="inline font-semibold">{t.station}: </dt><dd className="inline">{side.station} · {formatIST(side.measuredAt)} · {side.source}</dd></div>
          </dl>
          {side.stale && <p className="mt-2 text-sm font-medium text-amber-900">{t.stale}</p>}
        </>
      )}
    </li>
  );
}
