"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { AiFailureReason } from "@/lib/ai/failure";
import type { Advice, AdviceItem, Section } from "@/lib/ai/schema";
import TipFeedback from "@/features/feedback/TipFeedback";
import { UI, type Language } from "@/lib/i18n";

const TABS: Section[] = ["routines", "indoor", "alternatives"];
const PRIORITY_STYLE: Record<AdviceItem["priority"], string> = {
  high: "border-danger text-danger-text",
  medium: "border-warn text-warn-text",
  low: "border-line-strong text-ink",
};

export interface AdviceTabsProps {
  advice: Advice;
  generatedBy: "gemini" | "rules";
  /** Why AI was not used (code only), shown as a short note. */
  fallbackReason?: AiFailureReason;
  language: Language;
}

/** Personalised plan in three WAI-ARIA tabs (arrow keys, Home, End). Model text is rendered as plain text only. */
export default function AdviceTabs({ advice, generatedBy, fallbackReason = "other", language }: AdviceTabsProps) {
  const id = useId();
  const t = UI[language].plan;
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent) {
    const last = TABS.length - 1;
    const next = { ArrowRight: active === last ? 0 : active + 1, ArrowLeft: active === 0 ? last : active - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">{t.heading}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {generatedBy === "gemini" ? t.byGemini : t.byRules(t.aiReasons[fallbackReason])}
      </p>
      <div>
        <p className="mt-3">{advice.summary}</p>
        <p className="mt-2 font-medium">
          <span className="text-ink-muted">{t.bestTime}</span>
          {advice.bestOutdoorWindow}
        </p>
      </div>

      <div role="tablist" aria-label={t.tabsLabel} className="mt-4 flex flex-wrap gap-2 border-b border-line" onKeyDown={onKeyDown}>
        {TABS.map((key, i) => (
          <button
            key={key} ref={(el) => { tabRefs.current[i] = el; }} id={`${id}-tab-${key}`} role="tab" type="button"
            aria-selected={active === i} aria-controls={`${id}-panel-${key}`} tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)}
            className={`-mb-px min-h-11 rounded-t-md border-b-4 px-4 py-2 font-medium ${active === i ? "border-brand text-brand-text" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {t.tabs[key]} <span className="text-ink-muted">({advice[key].length})</span>
          </button>
        ))}
      </div>

      {TABS.map((key, i) => (
        <div key={key} id={`${id}-panel-${key}`} role="tabpanel" aria-labelledby={`${id}-tab-${key}`} hidden={active !== i} tabIndex={0} className="pt-4">
          {advice[key].length === 0 ? <p>{t.empty}</p> : (
            <ul className="grid gap-4">
              {advice[key].map((item, n) => <Item key={n} item={item} language={language} />)}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

function Item({ item, language }: { item: AdviceItem; language: Language }) {
  const t = UI[language].plan;
  return (
    <li className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{item.action}</h3>
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[item.priority]}`}>{t.priority[item.priority]}</span>
      </div>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[7rem_1fr]">
        <dt className="font-semibold text-ink-muted">{t.why}</dt>
        <dd>{item.why}</dd>
        <dt className="font-semibold text-ink-muted">{t.impact}</dt>
        <dd>{item.impact}</dd>
        <dt className="font-semibold text-ink-muted">{t.forYou}</dt>
        <dd>{item.personalizedFor}</dd>
      </dl>
      {item.id && <TipFeedback tipId={item.id} language={language} />}
    </li>
  );
}
