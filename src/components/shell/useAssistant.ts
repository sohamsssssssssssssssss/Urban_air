"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiFailureReason } from "@/lib/ai/failure";
import type { Advice } from "@/lib/ai/schema";
import { errorMessage, type Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
import { clearStored, readFlag, readValue, writeFlag, writeStored } from "@/features/shared/storage";
import type { AirState } from "../AqiCard";
import { ApiError, fetchAdvice, fetchAir } from "../apiClient";
import { SETUP_STORAGE_KEY, type Setup } from "./setup";

export interface Plan {
  advice: Advice;
  generatedBy: "gemini" | "rules";
  todayLine?: string;
  fallbackReason?: AiFailureReason;
  language: Language;
}
export type PlanState = "idle" | "loading" | "error";

const LANGUAGE_KEY = "language";
const KIDS_KEY = "kids";

/**
 * All app state in one place: language, the saved household, the live reading, the plan and kid mode.
 * - Returning visitors get their saved household and a fresh live reading on load (no AI request).
 * - The plan (the only Gemini call) is requested when the Plan section is opened, never on page load.
 */
export function useAssistant() {
  const [language, setLanguageState] = useState<Language>("en");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [checked, setChecked] = useState(false);
  const [air, setAir] = useState<AirState>({ status: "idle" });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planState, setPlanState] = useState<PlanState>("idle");
  const [planError, setPlanError] = useState("");
  const [kidMode, setKidMode] = useState(false);
  const latest = useRef({ language, setup, kidMode });
  latest.current = { language, setup, kidMode };

  const messageFor = (err: unknown, lang: Language) => (err instanceof ApiError ? errorMessage(lang, err.code, err.message) : errorMessage(lang));

  const loadAir = useCallback(async (s: Setup) => {
    setAir({ status: "loading" });
    try {
      setAir({ status: "ready", snapshot: await fetchAir(s.location) });
    } catch (err) {
      setAir({ status: "unavailable", message: messageFor(err, s.language) });
    }
  }, []);

  // After hydration: saved language, kid-mode preference and (for returning visitors) the saved household.
  useEffect(() => {
    const lang = readValue(LANGUAGE_KEY);
    if (lang === "en" || lang === "hi") setLanguageState(lang);
    setKidMode(readFlag(KIDS_KEY));
    const raw = readValue(SETUP_STORAGE_KEY);
    if (raw === undefined) return setChecked(true);
    // Validation needs Zod, so it loads only when there is something saved.
    void import("./setup").then(({ parseSetup }) => {
      const saved = parseSetup(raw);
      setChecked(true);
      if (!saved) return;
      setLanguageState(saved.language);
      setSetup(saved);
      void loadAir(saved);
    });
  }, [loadAir]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    writeStored(LANGUAGE_KEY, lang);
    setPlan((p) => (p && p.language !== lang ? null : p)); // advice is written in one language: ask again in the new one
    setPlanState((s) => (s === "loading" ? s : "idle"));
    const s = latest.current.setup;
    if (s) {
      const next = { ...s, language: lang };
      setSetup(next);
      writeStored(SETUP_STORAGE_KEY, next);
    }
  }, []);

  /** Saves the household and fetches the live reading. The plan is requested later, when the Plan section opens. */
  const submit = useCallback((location: Location, profile: UserProfile, lang: Language) => {
    const next: Setup = { location, profile, language: lang };
    setLanguageState(lang);
    writeStored(LANGUAGE_KEY, lang);
    setSetup(next);
    writeStored(SETUP_STORAGE_KEY, next);
    setPlan(null);
    setPlanState("idle");
    setPlanError("");
    void loadAir(next);
  }, [loadAir]);

  const loadPlan = useCallback(async (tone?: boolean) => {
    const { setup: s, language: lang, kidMode: kids } = latest.current;
    if (!s) return;
    setPlanState("loading");
    setPlanError("");
    try {
      const wantKids = (tone ?? kids) && s.profile.kids;
      const { advice, generatedBy, todayLine, fallbackReason, snapshot } = await fetchAdvice(s.location, s.profile, lang, wantKids ? "kids" : "standard");
      setPlan({ advice, generatedBy, todayLine, fallbackReason, language: lang });
      setAir({ status: "ready", snapshot });
      setPlanState("idle");
    } catch (err) {
      if (err instanceof ApiError && err.code === "AQ_UNAVAILABLE") setAir({ status: "unavailable", message: messageFor(err, lang) });
      setPlanError(messageFor(err, lang));
      setPlanState("error");
    }
  }, []);

  const changeTone = useCallback((next: boolean) => {
    setKidMode(next);
    writeFlag(KIDS_KEY, next);
    void loadPlan(next);
  }, [loadPlan]);

  const forget = useCallback(() => {
    clearStored(SETUP_STORAGE_KEY);
    setSetup(null);
    setPlan(null);
    setPlanState("idle");
    setAir({ status: "idle" });
  }, []);

  const refreshAir = useCallback(() => {
    if (latest.current.setup) void loadAir(latest.current.setup);
  }, [loadAir]);

  return { language, setLanguage, setup, checked, air, plan, planState, planError, kidMode, submit, loadPlan, changeTone, forget, refreshAir };
}
export type AppApi = ReturnType<typeof useAssistant>;
