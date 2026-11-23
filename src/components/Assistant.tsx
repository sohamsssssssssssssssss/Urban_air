"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { AiFailureReason } from "@/lib/ai/failure";
import type { Advice } from "@/lib/ai/schema";
import { UI, errorMessage, type Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
import TodayLine from "@/features/today/TodayLine";
import AdviceTabs from "./AdviceTabs";
import AqiCard, { type AirState } from "./AqiCard";
import ProfileForm from "./ProfileForm";
import { ApiError, fetchAdvice, fetchAir } from "./apiClient";

// Chat is below the fold and only useful after advice loads: keep it out of the initial bundle.
// The route planner is independent of the plan and below the fold: load it lazily too.
const RoutePlanner = dynamic(() => import("./RoutePlanner"), { loading: () => <p>…</p> });
const ChatPanel = dynamic(() => import("./ChatPanel"), { loading: () => <p>…</p> });

type Plan = { advice: Advice; generatedBy: "gemini" | "rules"; todayLine?: string; fallbackReason?: AiFailureReason; language: Language };
type Request = { location: Location; profile: UserProfile; language: Language };

/** Client island orchestrating onboarding -> live AQI -> plan -> chat. */
export default function Assistant() {
  const [language, setLanguage] = useState<Language>("en");
  const [air, setAir] = useState<AirState>({ status: "idle" });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planError, setPlanError] = useState("");
  const [request, setRequest] = useState<Request | null>(null);
  const [busy, setBusy] = useState(false);
  const t = UI[language];

  // Keep the document language in sync so screen readers switch pronunciation.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const messageFor = (err: unknown, lang: Language) => (err instanceof ApiError ? errorMessage(lang, err.code, err.message) : errorMessage(lang));

  async function run(location: Location, profile: UserProfile, lang: Language) {
    setBusy(true);
    setAir({ status: "loading" });
    setPlan(null);
    setPlanError("");
    setRequest({ location, profile, language: lang });
    // Both calls share one upstream fetch thanks to server-side request de-duplication.
    const airCall = fetchAir(location)
      .then((snapshot) => setAir({ status: "ready", snapshot }))
      .catch((err: unknown) => setAir({ status: "unavailable", message: messageFor(err, lang) }));
    const adviceCall = fetchAdvice(location, profile, lang)
      .then(({ advice, generatedBy, todayLine, fallbackReason, snapshot }) => {
        setPlan({ advice, generatedBy, todayLine, fallbackReason, language: lang });
        setAir({ status: "ready", snapshot });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === "AQ_UNAVAILABLE") return; // already shown in the AQI card
        setPlanError(messageFor(err, lang));
      });
    await Promise.all([airCall, adviceCall]);
    setBusy(false);
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-3 focus:text-blue-800">
        {t.page.skip}
      </a>
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-3xl font-bold tracking-tight">SmogSense</h1>
          <p className="mt-1 max-w-2xl text-slate-200">{t.page.description}</p>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto grid max-w-5xl gap-6 px-4 py-8 focus:outline-none">
        {air.status === "ready" && request && (
          <TodayLine snapshot={air.snapshot} profile={request.profile} language={language} aiLine={plan?.language === language ? plan.todayLine : undefined} />
        )}
        <ProfileForm onSubmit={run} busy={busy} language={language} onLanguageChange={setLanguage} />
        <AqiCard state={air} language={language} />
        {busy && !plan && air.status !== "unavailable" && (
          <p role="status" className="flex items-center gap-2 text-slate-700">
            <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
            {t.plan.building}
          </p>
        )}
        {planError && <p role="alert" className="rounded-lg border border-red-800 bg-red-50 p-3 text-red-900">{planError}</p>}
        {plan && <AdviceTabs {...plan} />}
        {plan && request && <ChatPanel {...request} />}
      <RoutePlanner language={language} />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-700">
          {t.page.sources}{" "}
          <a className="underline" href="https://openaq.org" rel="noopener noreferrer">OpenAQ</a>{" "}
          {t.page.and}{" "}
          <a className="underline" href="https://data.gov.in" rel="noopener noreferrer">{t.page.cpcb}</a>.{" "}
          {t.page.method}
        </p>
      </footer>
    </>
  );
}
