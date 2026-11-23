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
  const btn = "min-h-11 rounded-md border px-4 py-2 font-medium";
  return (
    <div className="mt-4">
      <h3 className="font-semibold">{t.recent}</h3>
      {state.trips.length === 0 ? <p className="mt-1 text-sm">{t.empty}</p> : (
        <ul className="mt-1 divide-y divide-slate-100 text-sm">
          {state.trips.slice(0, RECENT_TRIPS_SHOWN).map((trip) => {
            const label = t.tripLine({ date: trip.date, mode: MODE_NAME[language][trip.mode], km: trip.km, source: trip.source === "route" ? t.sourceRoute : t.sourceManual });
            return (
              <li key={trip.id} className="flex items-center justify-between gap-3 py-1">
                <span>{label}</span>
                <button type="button" onClick={() => onRemove(trip.id)} aria-label={t.remove(label)} className={`${btn} border-slate-400 text-slate-800 hover:bg-slate-100`}>✕</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={state.trips.length === 0} onClick={() => downloadText("smogsense-trips.csv", toCsv(state))} className={`${btn} border-blue-700 text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50`}>{t.exportCsv}</button>
        {!confirming ? (
          <button type="button" disabled={state.trips.length === 0} onClick={() => setConfirming(true)} className={`${btn} border-red-800 text-red-900 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50`}>{t.clear}</button>
        ) : (
          <div role="alertdialog" aria-label={t.clear} className="flex flex-wrap items-center gap-3 rounded-lg border border-red-800 bg-red-50 p-3">
            <p className="text-sm text-red-950">{t.confirmClear(state.trips.length)}</p>
            <button type="button" onClick={() => { onClear(); setConfirming(false); }} className={`${btn} border-red-900 bg-red-800 text-white hover:bg-red-900`}>{t.confirmYes}</button>
            <button type="button" autoFocus onClick={() => setConfirming(false)} className={`${btn} border-slate-500 hover:bg-white`}>{t.cancel}</button>
          </div>
        )}
      </div>
    </div>
  );
}
