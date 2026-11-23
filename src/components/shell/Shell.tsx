"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import OutlookSection from "@/sections/OutlookSection";
import PlanSection from "@/sections/PlanSection";
import RoutesSection from "@/sections/RoutesSection";
import TodaySection from "@/sections/TodaySection";
import MeSection from "@/sections/MeSection";
import { ALERT_SLOT_ID } from "@/features/alerts/AlertBanner";
import type { TripDraft } from "@/features/tracker/schema";
import { UI } from "@/lib/i18n";
import { SHELL } from "@/lib/i18n.shell";
import ChatDialog from "./ChatDialog";
import { Logo } from "./icons";
import LanguageSwitch from "./LanguageSwitch";
import Nav from "./Nav";
import { SECTIONS, type SectionId } from "./sections";
import { useAssistant } from "./useAssistant";
import { useSection } from "./useSection";

// Alerts run in the background of every section, so the host mounts once a household exists (and loads lazily: it needs Zod).
const AlertsHost = dynamic(() => import("@/features/alerts/AlertsHost"));

/** The app shell: skip link, header, section navigation, the five deep-linkable sections, alerts runner and chat. */
export default function Shell() {
  const app = useAssistant();
  const { active, visited, go, navigated } = useSection();
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const t = SHELL[app.language];
  const ui = UI[app.language];

  // Move focus to the new section's heading after a navigation (not on first load), so screen readers announce it.
  useEffect(() => {
    if (navigated) heading.current?.focus();
  }, [active, navigated]);

  const panel = (id: SectionId) => {
    switch (id) {
      case "today": return <TodaySection app={app} />;
      case "plan": return <PlanSection app={app} />;
      case "routes": return <RoutesSection language={app.language} onLogTrip={(d) => { setDraft(d); go("me"); }} />;
      case "outlook": return <OutlookSection app={app} />;
      case "me": return <MeSection app={app} draft={draft} />;
    }
  };

  return (
    <div data-aqi={app.air.status === "ready" ? app.air.snapshot.category : undefined}>
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-brand-text">
        {t.skip}
      </a>
      <Nav active={active} language={app.language} />
      <div className="lg:pl-sidebar">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight lg:invisible"><Logo className="h-8 w-8" />{t.brand}</p>
            <LanguageSwitch language={app.language} onChange={app.setLanguage} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto grid min-h-[70dvh] max-w-shell gap-6 px-4 pb-40 pt-6 focus:outline-none lg:px-8 lg:pb-24">
          <div id={ALERT_SLOT_ID} />
          {SECTIONS.map((id) =>
            visited.has(id) ? (
              <div key={id} hidden={active !== id} className="grid gap-6">
                <h1 ref={active === id ? heading : undefined} tabIndex={-1} className="text-3xl font-extrabold tracking-tight focus:outline-none">{t.titles[id]}</h1>
                {panel(id)}
              </div>
            ) : null,
          )}
        </main>
        <footer className="border-t border-line bg-surface pb-24 lg:pb-0">
          <p className="mx-auto max-w-shell px-4 py-6 text-sm text-ink-muted lg:px-8">
            {ui.page.sources} <a className="underline" href="https://openaq.org" rel="noopener noreferrer">OpenAQ</a> {ui.page.and}{" "}
            <a className="underline" href="https://data.gov.in" rel="noopener noreferrer">{ui.page.cpcb}</a>. {ui.page.method}
          </p>
        </footer>
      </div>
      {app.setup && <AlertsHost location={app.setup.location} language={app.language} meOpened={visited.has("me")} />}
      {app.setup && <ChatDialog location={app.setup.location} profile={app.setup.profile} language={app.language} />}
    </div>
  );
}
