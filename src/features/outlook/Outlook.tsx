"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchOutlook } from "@/components/apiClient";
import { CATEGORY_LABEL, errorMessage, type Language } from "@/lib/i18n";
import type { Location } from "@/lib/profile";
import type { Outlook as OutlookData } from "./server";
import { formatWhen, formatWindowWhen } from "./logic";
import OutlookChart from "./OutlookChart";
import { OUTLOOK_STRINGS } from "./strings";
import Section from "@/components/ui/Section";

/** 48-hour model forecast with the cleanest windows, a chart with a text alternative, and an hourly table. */
export default function Outlook({ location, language }: { location: Location; language: Language }) {
  const t = OUTLOOK_STRINGS[language];
  const [data, setData] = useState<OutlookData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetchOutlook(location, controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? errorMessage(language, err.code, err.message) : errorMessage(language));
      });
    return () => controller.abort();
  }, [location, language, attempt]);

  return (
    <Section title={t.heading} busy={!data && !error}>
      <p className="mt-1 inline-block rounded border-2 border-warn bg-warn-soft px-2 py-1 text-sm font-semibold text-warn-text">{t.badge}</p>
      <p className="mt-2 text-ink">{t.intro}</p>
      {!data && !error && <p className="mt-3 text-ink-muted">{t.loading}</p>}
      {error && (
        <div role="alert" className="mt-3 rounded-control border border-danger bg-danger-soft p-3 text-danger-text">
          <p>{error}</p>
          <button type="button" onClick={retry} className="mt-2 min-h-11 rounded-control border border-danger px-4 py-2 font-medium hover:bg-danger-soft">{t.retry}</button>
        </div>
      )}
      {data && (
        <>
          <h3 className="mt-4 font-semibold">{t.windowsHeading}</h3>
          {data.windows.length === 0 ? <p>{t.noWindows}</p> : (
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              {data.windows.map((w) => <li key={w.rank}>{t.windowLine({ when: formatWindowWhen(w, language), avg: w.avgPm25, category: CATEGORY_LABEL[language][w.category] })}</li>)}
            </ol>
          )}
          <p className="mt-1 text-xs text-ink-muted">{t.estimateNote}</p>
          <OutlookChart hours={data.hours} windows={data.windows} language={language} />
          <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-2 font-medium text-brand-text">{t.showTable}</summary>
            <div className="max-h-72 overflow-auto" tabIndex={0} role="region" aria-label={t.showTable}>
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-line">{[t.colTime, t.colPm25, t.colPm10].map((h) => <th key={h} scope="col" className="py-1 pr-3">{h}</th>)}</tr></thead>
                <tbody>
                  {data.hours.map((h) => (
                    <tr key={h.at} className="border-b border-line">
                      <th scope="row" className="py-1 pr-3 font-normal">{formatWhen(h.at, language)}</th>
                      <td className="py-1 pr-3 tabular-nums">{h.pm25 ?? "—"}</td>
                      <td className="py-1 tabular-nums">{h.pm10 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
      <p className="mt-3 text-xs text-ink-muted">{t.attribution}</p>
    </Section>
  );
}
