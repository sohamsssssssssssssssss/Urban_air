"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import AdviceTabs from "@/components/AdviceTabs";
import type { AppApi } from "@/components/shell/useAssistant";
import { buttonClass } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import KidModeToggle from "@/features/kids/KidModeToggle";
import { cityOrDefault } from "@/features/share/city";
import { SHELL } from "@/lib/i18n.shell";
import { UI } from "@/lib/i18n";
import { Lazy, NeedsSetup } from "./shared";

const ShareCard = dynamic(() => import("@/features/share/ShareCard"), { loading: () => <Skeleton className="h-64" /> });

/** The Gemini plan (requested the first time this section opens), kid mode and the share card. */
export default function PlanSection({ app }: { app: AppApi }) {
  const { setup, plan, planState, language, loadPlan } = app;
  const t = SHELL[language].plan;
  const needsPlan = !!setup && (!plan || plan.language !== language) && planState === "idle";
  useEffect(() => {
    if (needsPlan) void loadPlan();
  }, [needsPlan, loadPlan]);

  if (!setup) return <NeedsSetup language={language} />;
  return (
    <Lazy>
      {planState === "error" && <EmptyState kind="error" title={t.errorTitle} body={app.planError} action={<button type="button" onClick={() => void loadPlan()} className={buttonClass("primary")}>{t.retry}</button>} />}
      {planState !== "error" && !plan && (
        <div aria-busy="true" className="rounded-card border border-line bg-surface p-5 shadow-card">
          <p role="status" aria-live="polite" className="font-bold text-ink-muted">{UI[language].plan.building}</p>
          <Skeleton className="mt-4 h-96" />
          <p className="mt-2 text-ink-muted text-xs">{UI[language].plan.building}</p>
        </div>
      )}
      {plan && setup.profile.kids && <KidModeToggle enabled={app.kidMode} busy={planState === "loading"} language={language} onChange={app.changeTone} />}
      {plan && <AdviceTabs {...plan} />}
      <ShareCard city={cityOrDefault(setup.location.city)} language={language} />
    </Lazy>
  );
}
