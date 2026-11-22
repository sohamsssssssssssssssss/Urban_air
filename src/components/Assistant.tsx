"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Advice } from "@/lib/ai/schema";
import { UI, errorMessage, type Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
import AdviceTabs from "./AdviceTabs";
import AqiCard, { type AirState } from "./AqiCard";
import ProfileForm from "./ProfileForm";
import { ApiError, fetchAdvice, fetchAir } from "./apiClient";

// Chat is below the fold and only useful after advice loads: keep it out of the initial bundle.
const ChatPanel = dynamic(() => import("./ChatPanel"), { loading: () => <p>…</p> });

type Plan = { advice: Advice; generatedBy: "gemini" | "rules"; language: Language };
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
      .then(({ advice, generatedBy, snapshot }) => {
        setPlan({ advice, generatedBy, language: lang });
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
    <div className="grid gap-6" lang={language}>
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
    </div>
  );
}
