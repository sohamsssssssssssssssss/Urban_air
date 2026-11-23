import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  id: string;
  label: ReactNode;
  panel: ReactNode;
}

/** WAI-ARIA tabs: arrow keys, Home and End move between tabs; only the selected panel is shown. */
export default function Tabs({ label, tabs, className }: { label: string; tabs: TabItem[]; className?: string }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent) {
    const last = tabs.length - 1;
    const next = { ArrowRight: active === last ? 0 : active + 1, ArrowLeft: active === 0 ? last : active - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1 rounded-control bg-sunken p-1">
        {tabs.map((t, i) => (
          <button
            key={t.id} ref={(el) => { refs.current[i] = el; }} id={`${base}-tab-${t.id}`} role="tab" type="button"
            aria-selected={active === i} aria-controls={`${base}-panel-${t.id}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)}
            className={cn("min-h-11 flex-1 rounded-control px-4 py-2 text-sm font-bold transition-colors duration-fast", active === i ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} id={`${base}-panel-${t.id}`} role="tabpanel" aria-labelledby={`${base}-tab-${t.id}`} hidden={active !== i} tabIndex={0} className="pt-4">
          {t.panel}
        </div>
      ))}
    </div>
  );
}
