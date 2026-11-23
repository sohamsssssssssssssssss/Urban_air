"use client";

import dynamic from "next/dynamic";
import Onboarding from "@/components/shell/Onboarding";
import LanguageSwitch from "@/components/shell/LanguageSwitch";
import ThemeSwitch from "@/components/shell/ThemeSwitch";
import type { AppApi } from "@/components/shell/useAssistant";
import ProfileForm from "@/components/ProfileForm";
import Card from "@/components/ui/Card";
import Section from "@/components/ui/Section";
import Skeleton from "@/components/ui/Skeleton";
import { ALERT_PANEL_SLOT_ID } from "@/features/alerts/AlertsHost";
import { ambientPm25 } from "@/features/tracker/ambient";
import type { TripDraft } from "@/features/tracker/schema";
import { buttonClass } from "@/components/ui/button";
import { SHELL } from "@/lib/i18n.shell";
import { Lazy } from "./shared";

const Tracker = dynamic(() => import("@/features/tracker/Tracker"), { loading: () => <Skeleton className="h-80" /> });

/** Household profile (or the short onboarding on a first visit), tracker, alerts slot, language, appearance. */
export default function MeSection({ app, draft }: { app: AppApi; draft: TripDraft | null }) {
  const { setup, language } = app;
  const t = SHELL[language];
  return (
    <Lazy>
      {!app.checked ? <Skeleton className="h-96" /> : setup ? (
        <>
          <div>
            <ProfileForm onSubmit={app.submit} busy={app.air.status === "loading"} language={language} onLanguageChange={app.setLanguage} initial={setup} />
            <p className="mt-2 text-sm text-ink-muted">{t.me.householdNote}</p>
          </div>
          <Tracker key={setup.profile.commuteMode} language={language} defaultBaseline={setup.profile.commuteMode} ambientUgm3={app.air.status === "ready" ? ambientPm25(app.air.snapshot) : null} draft={draft} />
          <div id={ALERT_PANEL_SLOT_ID} />
        </>
      ) : (
        <Onboarding language={language} onSubmit={app.submit} />
      )}
      <Section title={t.language}>
        <div className="mt-3"><LanguageSwitch language={language} onChange={app.setLanguage} /></div>
        <div className="mt-5"><ThemeSwitch language={language} /></div>
      </Section>
      {setup && (
        <Card className="p-5">
          <h2 className="text-xl font-bold">{t.me.forgetTitle}</h2>
          <p className="mt-1 text-ink-muted">{t.me.forgetBody}</p>
          <button type="button" onClick={app.forget} className={buttonClass("danger", "mt-3")}>{t.me.forget}</button>
        </Card>
      )}
    </Lazy>
  );
}
