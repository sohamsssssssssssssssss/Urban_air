"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Advice } from "@/lib/ai/schema";
import type { Language, Location, UserProfile } from "@/lib/profile";
import AdviceTabs from "./AdviceTabs";
import AqiCard, { type AirState } from "./AqiCard";
import ProfileForm from "./ProfileForm";
import { ApiError, fetchAdvice, fetchAir } from "./apiClient";

// Chat is below the fold and only useful after advice loads: keep it out of the initial bundle.
const ChatPanel = dynamic(() => import("./ChatPanel"), { loading: () => <p>Loading chat…</p> });

type Plan = { advice: Advice; generatedBy: "gemini" | "rules"; language: Language };
type Request = { location: Location; profile: UserProfile; language: Language };

const messageFor = (err: unknown) => (err instanceof ApiError ? err.message : "Couldn't reach SmogSense. Check your connection and try again.");

/** Client island orchestrating onboarding -> live AQI -> plan -> chat. */
export default function Assistant() {
  const [air, setAir] = useState<AirState>({ status: "idle" });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planError, setPlanError] = useState("");
  const [request, setRequest] = useState<Request | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(location: Location, profile: UserProfile, language: Language) {
    setBusy(true);
    setAir({ status: "loading" });
    setPlan(null);
    setPlanError("");
    setRequest({ location, profile, language });
    // Both calls share one upstream fetch thanks to server-side request de-duplication.
    const airCall = fetchAir(location)
      .then((snapshot) => setAir({ status: "ready", snapshot }))
      .catch((err: unknown) => setAir({ status: "unavailable", message: messageFor(err) }));
    const adviceCall = fetchAdvice(location, profile, language)
      .then(({ advice, generatedBy, snapshot }) => {
        setPlan({ advice, generatedBy, language });
        setAir({ status: "ready", snapshot });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === "AQ_UNAVAILABLE") return; // already shown in the AQI card
        setPlanError(messageFor(err));
      });
    await Promise.all([airCall, adviceCall]);
    setBusy(false);
  }

  return (
    <div className="grid gap-6">
      <ProfileForm onSubmit={run} busy={busy} />
      <AqiCard state={air} />
      {busy && !plan && air.status !== "unavailable" && (
        <p role="status" className="flex items-center gap-2 text-slate-700">
          <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          Building your personalised plan…
        </p>
      )}
      {planError && <p role="alert" className="rounded-lg border border-red-800 bg-red-50 p-3 text-red-900">{planError}</p>}
      {plan && <AdviceTabs {...plan} />}
      {plan && request && <ChatPanel {...request} />}
    </div>
  );
}
