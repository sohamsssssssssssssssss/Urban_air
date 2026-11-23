"use client";

import type { AiFailureReason } from "@/lib/ai/failure";
import type { Advice, AdviceItem, Section as SectionKey } from "@/lib/ai/schema";
import TipFeedback from "@/features/feedback/TipFeedback";
import { UI, type Language } from "@/lib/i18n";
import { impactPercent } from "./impact";
import Bar from "./ui/Bar";
import Card from "./ui/Card";
import Pill, { type PillTone } from "./ui/Pill";
import Section from "./ui/Section";
import Tabs from "./ui/Tabs";

const TABS: SectionKey[] = ["routines", "indoor", "alternatives"];
const PRIORITY_TONE: Record<AdviceItem["priority"], PillTone> = { high: "danger", medium: "warn", low: "neutral" };

export interface AdviceTabsProps {
  advice: Advice;
  generatedBy: "gemini" | "rules";
  /** Why AI was not used (code only), shown as a short note. */
  fallbackReason?: AiFailureReason;
  language: Language;
}

/** The personalised plan as three tabs of cards. Model text is rendered as plain text only. */
export default function AdviceTabs({ advice, generatedBy, fallbackReason = "other", language }: AdviceTabsProps) {
  const t = UI[language].plan;
  return (
    <Section title={t.heading}>
      <p className="mt-1 text-sm text-ink-muted">{generatedBy === "gemini" ? t.byGemini : t.byRules(t.aiReasons[fallbackReason])}</p>
      <div>
        <p className="mt-3 text-lg">{advice.summary}</p>
        <p className="mt-2 font-semibold">
          <span className="text-ink-muted">{t.bestTime}</span>
          {advice.bestOutdoorWindow}
        </p>
      </div>
      <Tabs
        label={t.tabsLabel} className="mt-5"
        tabs={TABS.map((key) => ({
          id: key,
          label: <>{t.tabs[key]} <span className="font-semibold text-ink-muted">({advice[key].length})</span></>,
          panel: advice[key].length === 0 ? <p>{t.empty}</p> : <ul className="grid gap-3">{advice[key].map((item, n) => <Tip key={n} item={item} language={language} />)}</ul>,
        }))}
      />
    </Section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[5.5rem_1fr] sm:gap-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted sm:pt-0.5">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** One tip: the action, a priority pill, then Why / Impact / For you as compact rows. The impact bar is decorative. */
function Tip({ item, language }: { item: AdviceItem; language: Language }) {
  const t = UI[language].plan;
  const percent = impactPercent(item.impact);
  return (
    <Card as="li" className="p-4 shadow-none">
      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between">
        <h3 className="min-w-0 flex-1 text-base font-bold">{item.action}</h3>
        <Pill tone={PRIORITY_TONE[item.priority]}>{t.priority[item.priority]}</Pill>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <Row label={t.why}>{item.why}</Row>
        <Row label={t.impact}>
          {item.impact}
          {percent !== undefined && <Bar percent={percent} className="mt-1.5 max-w-xs" />}
        </Row>
        <Row label={t.forYou}>{item.personalizedFor}</Row>
      </dl>
      {item.id && <TipFeedback tipId={item.id} language={language} />}
    </Card>
  );
}
