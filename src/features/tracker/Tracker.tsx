"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { COMMUTE_MODES, type CommuteMode } from "@/lib/commute";
import { MODE_NAME, type Language } from "@/lib/i18n";
import { istDayKey } from "../shared/storage";
import { useStoredState } from "../shared/useStoredState";
import { TRACKER_STORAGE_KEY } from "./constants";
import { addTrip, removeTrip } from "./logic";
import { TrackerStateSchema, type TripDraft } from "./schema";
import TrackerList from "./TrackerList";
import TrackerSummary from "./TrackerSummary";
import { TRACKER_STRINGS } from "./strings";

const field = "mt-1 block min-h-11 w-full rounded-md border border-slate-500 bg-white px-3 py-2";
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export interface TrackerProps {
  language: Language;
  /** The household's usual mode; the starting baseline. */
  defaultBaseline: CommuteMode;
  /** Current PM2.5 for new manual trips (null if unknown). */
  ambientUgm3: number | null;
  /** A route chosen in the planner, to prefill the form. */
  draft: TripDraft | null;
}

/** Trip log with weekly/monthly impact vs the baseline mode, CSV export and clear-all. Saved on this device. */
export default function Tracker({ language, defaultBaseline, ambientUgm3, draft }: TrackerProps) {
  const id = useId();
  const t = TRACKER_STRINGS[language];
  const [state, setState] = useStoredState(TRACKER_STORAGE_KEY, TrackerStateSchema, { baseline: defaultBaseline, trips: [] });
  const [date, setDate] = useState(() => istDayKey());
  const [mode, setMode] = useState<CommuteMode>(defaultBaseline);
  const [km, setKm] = useState("");
  const [fromRoute, setFromRoute] = useState<TripDraft | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!draft) return;
    setMode(draft.mode);
    setKm(String(draft.km));
    setFromRoute(draft);
    setMessage("");
  }, [draft]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = addTrip(state, { date, mode, km: Number(km), source: fromRoute ? "route" : "manual", ambientUgm3: fromRoute ? fromRoute.ambientUgm3 : ambientUgm3 }, newId());
    if (!result.ok) return setMessage(t.errors[result.error]);
    setState(result.state);
    setKm("");
    setFromRoute(null);
    setMessage(t.logged);
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-slate-800">{t.intro}</p>
      <div className="mt-3 max-w-xs">
        <label htmlFor={`${id}-base`} className="block font-medium">{t.baseline}</label>
        <select id={`${id}-base`} className={field} value={state.baseline} aria-describedby={`${id}-base-hint`} onChange={(e) => setState((s) => ({ ...s, baseline: e.target.value as CommuteMode }))}>
          {COMMUTE_MODES.map((m) => <option key={m} value={m}>{MODE_NAME[language][m]}</option>)}
        </select>
        <p id={`${id}-base-hint`} className="mt-1 text-sm text-slate-700">{t.baselineHint}</p>
      </div>
      <TrackerSummary trips={state.trips} baseline={state.baseline} language={language} />
      <p className="mt-2 text-xs text-slate-700">{t.estimatedNote}</p>

      <h3 className="mt-4 font-semibold">{t.addHeading}</h3>
      {fromRoute && <p className="mt-1 text-sm text-blue-900">{t.prefilled}</p>}
      <form onSubmit={submit} className="mt-2 grid gap-3 sm:grid-cols-4 sm:items-end">
        <div>
          <label htmlFor={`${id}-date`} className="block font-medium">{t.date}</label>
          <input id={`${id}-date`} type="date" className={field} value={date} max={istDayKey()} required onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-mode`} className="block font-medium">{t.mode}</label>
          <select id={`${id}-mode`} className={field} value={mode} onChange={(e) => setMode(e.target.value as CommuteMode)}>
            {COMMUTE_MODES.map((m) => <option key={m} value={m}>{MODE_NAME[language][m]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-km`} className="block font-medium">{t.km}</label>
          <input id={`${id}-km`} type="number" inputMode="decimal" min={0.1} max={100} step="0.1" className={field} value={km} required onChange={(e) => setKm(e.target.value)} />
        </div>
        <button type="submit" className="min-h-11 rounded-md bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800">{t.submit}</button>
      </form>
      <p aria-live="polite" className="mt-2 min-h-6 text-sm font-medium">{message}</p>

      <TrackerList state={state} language={language} onRemove={(tid) => setState((s) => removeTrip(s, tid))} onClear={() => setState((s) => ({ ...s, trips: [] }))} />
      <p className="mt-3 text-xs text-slate-700">{t.storage}</p>
    </section>
  );
}
