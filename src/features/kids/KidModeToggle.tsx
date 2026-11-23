import { useId } from "react";
import type { Language } from "@/lib/i18n";
import { KIDS_STRINGS } from "./strings";

export interface KidModeToggleProps {
  enabled: boolean;
  busy: boolean;
  language: Language;
  onChange: (enabled: boolean) => void;
}

/** Shown only when the household has children. Switches routine and indoor tips to simple wording. */
export default function KidModeToggle({ enabled, busy, language, onChange }: KidModeToggleProps) {
  const id = useId();
  const t = KIDS_STRINGS[language];
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <label className="flex min-h-11 items-center gap-3 font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-brand" checked={enabled} disabled={busy} aria-describedby={`${id}-hint`} onChange={(e) => onChange(e.target.checked)} />
        {t.label}
      </label>
      <p id={`${id}-hint`} className="mt-1 text-sm text-ink">{t.hint}</p>
      <p aria-live="polite" className="mt-1 text-sm text-ink-muted">{busy ? t.updating : enabled ? t.active : ""}</p>
    </div>
  );
}
