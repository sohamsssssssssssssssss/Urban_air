"use client";

import { useId, useState, type FormEvent } from "react";
import { ROUTE_PLACE_MAX_CHARS } from "@/lib/route/constants";
import { departAtFromTime } from "@/lib/route/depart";
import { errorMessage, type Language } from "@/lib/i18n";
import { ROUTE_UI } from "@/lib/i18n.route";
import type { RouteResult } from "@/lib/route";
import { ApiError, fetchRoutes } from "./apiClient";
import type { TripDraft } from "@/features/tracker/schema";
import RouteResults from "./RouteResults";

const field = "mt-1 block min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 py-2";

/** Origin/destination form that asks /api/route for routes ranked by estimated PM2.5 inhaled. */
export default function RoutePlanner({ language, onLogTrip }: { language: Language; onLogTrip?: (draft: TripDraft) => void }) {
  const id = useId();
  const t = ROUTE_UI[language];
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RouteResult | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await fetchRoutes({ origin: { query: from }, destination: { query: to }, language, departAt: departAtFromTime(time) }));
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(language, err.code, err.message) : errorMessage(language));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-ink">{t.intro}</p>
      <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor={`${id}-from`} className="block font-medium">{t.from}</label>
          <input id={`${id}-from`} className={field} value={from} onChange={(e) => setFrom(e.target.value)} maxLength={ROUTE_PLACE_MAX_CHARS} minLength={2} required placeholder={t.placeholderFrom} autoComplete="off" />
        </div>
        <div>
          <label htmlFor={`${id}-to`} className="block font-medium">{t.to}</label>
          <input id={`${id}-to`} className={field} value={to} onChange={(e) => setTo(e.target.value)} maxLength={ROUTE_PLACE_MAX_CHARS} minLength={2} required placeholder={t.placeholderTo} autoComplete="off" />
        </div>
        <div>
          <label htmlFor={`${id}-time`} className="block font-medium">{t.leave}</label>
          <input id={`${id}-time`} type="time" className={field} value={time} onChange={(e) => setTime(e.target.value)} aria-describedby={`${id}-time-hint`} />
          <p id={`${id}-time-hint`} className="mt-1 text-sm text-ink-muted">{t.leaveHint}</p>
        </div>
        <div className="md:col-span-3">
          <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-brand px-6 py-2 font-semibold text-brand-ink hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted disabled:border-line">
            {busy ? t.submitting : t.submit}
          </button>
        </div>
      </form>
      <div aria-live="polite" aria-busy={busy}>
        {error && <p role="alert" className="mt-3 rounded-lg border border-danger bg-danger-soft p-3 text-danger-text">{error}</p>}
        {result && <RouteResults result={result} language={language} onLogTrip={onLogTrip} />}
      </div>
    </section>
  );
}
