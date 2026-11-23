import { useId } from "react";
import { POLLUTANT_LABEL } from "@/lib/aq/naqi";
import { POLLUTANTS, type AQSnapshot } from "@/lib/aq/types";
import { formatConcentration } from "@/lib/aq/units";
import { formatIST } from "@/lib/format";
import { CATEGORY_LABEL, HEALTH_IMPACT, UI, type Language } from "@/lib/i18n";
import { SHELL } from "@/lib/i18n.shell";
import CategoryIcon from "./CategoryIcon";
import { buttonClass } from "./ui/button";
import EmptyState from "./ui/EmptyState";
import Section from "./ui/Section";
import Skeleton from "./ui/Skeleton";
import Sparkline from "./ui/Sparkline";
import { clockIST, historyExtremes } from "./ui/sparkMath";

export type AirState = { status: "idle" } | { status: "loading" } | { status: "ready"; snapshot: AQSnapshot } | { status: "unavailable"; message: string };

const MIN_SPARK_POINTS = 6;

/**
 * The air-quality hero: a big AQI number on a tint of the category colour, the category as icon + text (never colour alone),
 * the 24 h PM2.5 trend, and the details. Loading, unavailable and empty states keep the same footprint to avoid layout shift.
 */
export default function AqiCard({ state, language = "en", onRetry }: { state: AirState; language?: Language; onRetry?: () => void }) {
  const t = UI[language].card;
  const s = SHELL[language];
  if (state.status === "ready") return <Reading snapshot={state.snapshot} language={language} />;
  if (state.status === "unavailable") {
    return (
      <Section title={t.heading} className="min-h-72">
        <div className="mt-3">
          <EmptyState kind="error" title={t.unavailableTitle} body={`${state.message} ${t.unavailableBody}`} action={onRetry && <button type="button" onClick={onRetry} className={buttonClass("primary")}>{s.today.unavailableAction}</button>} />
        </div>
      </Section>
    );
  }
  if (state.status === "idle") {
    return <Section title={t.heading} className="min-h-72"><p className="mt-3 text-ink-muted">{t.idle}</p></Section>;
  }
  return (
    <Section title={t.heading} busy className="min-h-72">
      <p role="status" className="sr-only">{t.loading}</p>
      <Skeleton className="mt-4 h-24 w-48" />
      <Skeleton className="mt-4 h-6 w-64" />
      <Skeleton className="mt-3 h-14 w-full max-w-xs" />
    </Section>
  );
}

function Reading({ snapshot: s, language }: { snapshot: AQSnapshot; language: Language }) {
  const id = useId();
  const t = UI[language].card;
  const h = SHELL[language].hero;
  const rows = POLLUTANTS.filter((p) => s.subIndices[p] !== undefined || s.pollutants[p] !== undefined);
  const missing = s.source === "CPCB" ? t.subIndexOnly : t.notReported;
  const history = s.history ?? [];
  const range = historyExtremes(history);

  return (
    <section aria-labelledby={`${id}-h`} data-aqi={s.category} className="rounded-card border border-line bg-aqi-tint p-5 shadow-card sm:p-6">
      <h2 id={`${id}-h`} className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t.heading}</h2>
      <p className="mt-0.5 text-sm font-semibold text-ink-muted">{s.provisional ? t.provisional : t.aqiMethod}</p>
      <div aria-live="polite" className="mt-3 flex flex-wrap items-end gap-x-10 gap-y-4">
        <p data-aqi-value className="text-7xl font-extrabold leading-none tracking-tight tabular-nums sm:text-8xl">
          <span className="sr-only">AQI </span>
          {s.aqi}
        </p>
        <div className="min-w-0 max-w-prose pb-1">
          <p className="flex items-center gap-2 text-2xl font-extrabold">
            <span className="text-aqi-accent"><CategoryIcon category={s.category} /></span>
            {CATEGORY_LABEL[language][s.category]}
          </p>
          <p className="mt-1 text-ink">{HEALTH_IMPACT[language][s.category]}</p>
        </div>
      </div>

      {history.length >= MIN_SPARK_POINTS && range && (
        <div className="mt-5">
          <Sparkline
            values={history.map((p) => p.pm25)} title={h.history(history.length)}
            description={h.range({ low: Math.round(range.low.pm25), lowAt: clockIST(range.low.at), high: Math.round(range.high.pm25), highAt: clockIST(range.high.at) })}
          />
          <p className="mt-1 text-sm text-ink-muted">{h.history(history.length)}. {h.range({ low: Math.round(range.low.pm25), lowAt: clockIST(range.low.at), high: Math.round(range.high.pm25), highAt: clockIST(range.high.at) })}</p>
        </div>
      )}

      <p className="mt-4 text-sm text-ink-muted">{t.meta(s.station.name, formatIST(s.measuredAt), s.source)} {t.dominant(POLLUTANT_LABEL[s.dominant])}</p>
      {s.provisional && <p className="mt-2 text-sm text-warn-text">{t.provisionalDetail}</p>}
      {s.sensorType === "low-cost" && <p className="mt-2 text-sm text-ink-muted">{t.lowCost}</p>}
      <p className="mt-3 text-sm">
        <strong>{t.lastHour}</strong>{" · "}
        {s.pollutants.pm25 !== undefined ? `${Math.round(s.pollutants.pm25)} µg/m³ · ${formatIST(s.pm25MeasuredAt ?? s.measuredAt)}` : t.noHourlyPm25}
      </p>
      {s.stale && <p className="mt-3 rounded-control border border-warn bg-warn-soft p-3 text-sm font-medium text-warn-text">{t.stale}</p>}

      <details className="mt-4 rounded-control bg-surface/60 px-4 py-1">
        <summary className="min-h-11 cursor-pointer py-3 font-bold">{h.details}</summary>
        <table className="mb-3 w-full max-w-md text-left text-sm">
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
        {rows.some((p) => s.pollutants[p] === undefined) && <p className="mb-3 text-xs text-ink-muted">{missing}</p>}
      </details>
    </section>
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
