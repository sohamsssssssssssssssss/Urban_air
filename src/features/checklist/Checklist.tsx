"use client";

import type { AQSnapshot } from "@/lib/aq/types";
import type { Language } from "@/lib/i18n";
import type { UserProfile } from "@/lib/profile";
import { istDayKey } from "../shared/storage";
import { useStoredState } from "../shared/useStoredState";
import { CHECKLIST_STORAGE_KEY, ChecklistStateSchema, buildChecklist, tickedToday, toggleItem } from "./logic";
import { CHECKLIST_STRINGS } from "./strings";
import Section from "@/components/ui/Section";

const EMPTY = { day: "", checked: [] as string[] };

export interface ChecklistProps {
  snapshot: AQSnapshot;
  profile: UserProfile;
  language: Language;
}

/** Checkable indoor actions with Why and Impact, saved on this device and reset each (IST) day. */
export default function Checklist({ snapshot, profile, language }: ChecklistProps) {
  const t = CHECKLIST_STRINGS[language];
  const [state, setState] = useStoredState(CHECKLIST_STORAGE_KEY, ChecklistStateSchema, EMPTY);
  const items = buildChecklist(snapshot, profile, language);
  const ticked = tickedToday(state, items);

  return (
    <Section title={t.heading}>
      <p className="mt-1 text-ink">{t.intro}</p>
      <p aria-live="polite" className="mt-2 font-semibold">{t.progress(ticked.length, items.length)}</p>
      <fieldset className="mt-2">
        <legend className="sr-only">{t.groupLabel}</legend>
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-line p-3">
              <label className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox" className="mt-1 h-5 w-5 accent-brand" checked={ticked.includes(item.id)}
                  onChange={() => setState((prev) => toggleItem(prev, items, item.id))}
                />
                <span className="font-medium">{item.action}</span>
              </label>
              <dl className="mt-1 grid gap-1 pl-8 text-sm sm:grid-cols-[5rem_1fr]">
                <dt className="font-semibold text-ink-muted">{t.why}</dt>
                <dd>{item.why}</dd>
                <dt className="font-semibold text-ink-muted">{t.impact}</dt>
                <dd>{item.impact}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setState({ day: istDayKey(), checked: [] })} className="min-h-11 rounded-md border border-brand px-4 py-2 font-medium text-brand-text hover:bg-brand-soft">
          {t.uncheckAll}
        </button>
        <p className="text-xs text-ink-muted">{t.storage}</p>
      </div>
    </Section>
  );
}
