import { useState } from "react";
import { MODE_NAME, type Language } from "@/lib/i18n";
import { RECENT_TRIPS_SHOWN } from "./constants";
import type { TrackerState } from "./schema";
import { toCsv } from "./logic";
import { downloadText } from "./download";
import { TRACKER_STRINGS } from "./strings";

export interface TrackerListProps {
  state: TrackerState;
  language: Language;
  onRemove: (id: string) => void;
  onClear: () => void;
}

/** Recent trips with remove buttons, CSV export, and a two-step "clear all data". */
export default function TrackerList({ state, language, onRemove, onClear }: TrackerListProps) {
  const t = TRACKER_STRINGS[language];
  const [confirming, setConfirming] = useState(false);
  const btn = "min-h-11 rounded-control border px-4 py-2 font-medium";
  return (
    <div className="mt-4">
      <h3 className="font-semibold">{t.recent}</h3>
      {state.trips.length === 0 ? <p className="mt-1 text-sm">{t.empty}</p> : (
        <ul className="mt-1 divide-y divide-line text-sm">
          {state.trips.slice(0, RECENT_TRIPS_SHOWN).map((trip) => {
            const label = t.tripLine({ date: trip.date, mode: MODE_NAME[language][trip.mode], km: trip.km, source: trip.source === "route" ? t.sourceRoute : t.sourceManual });
            return (
              <li key={trip.id} className="flex items-center justify-between gap-3 py-1">
                <span>{label}</span>
                <button type="button" onClick={() => onRemove(trip.id)} aria-label={t.remove(label)} className={`${btn} border-line-strong text-ink hover:bg-sunken`}>✕</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={state.trips.length === 0} onClick={() => downloadText("smogsense-trips.csv", toCsv(state))} className={`${btn} border-brand text-brand-text hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50`}>{t.exportCsv}</button>
        {!confirming ? (
          <button type="button" disabled={state.trips.length === 0} onClick={() => setConfirming(true)} className={`${btn} border-danger text-danger-text hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50`}>{t.clear}</button>
        ) : (
          <div role="alertdialog" aria-label={t.clear} className="flex flex-wrap items-center gap-3 rounded-control border border-danger bg-danger-soft p-3">
            <p className="text-sm text-danger-text">{t.confirmClear(state.trips.length)}</p>
            <button type="button" onClick={() => { onClear(); setConfirming(false); }} className={`${btn} border-danger bg-danger text-danger-ink hover:bg-danger`}>{t.confirmYes}</button>
            <button type="button" autoFocus onClick={() => setConfirming(false)} className={`${btn} border-line-strong hover:bg-surface`}>{t.cancel}</button>
          </div>
        )}
      </div>
    </div>
  );
}
