"use client";

import { useState, type FormEvent } from "react";
import { ApiError, fetchCompare } from "@/components/apiClient";
import { errorMessage, type Language } from "@/lib/i18n";
import type { Location } from "@/lib/profile";
import { useStoredState } from "../shared/useStoredState";
import CompareCard from "./CompareCard";
import ComparePlaceField from "./ComparePlaceField";
import { compareSummary, defaultChoices, placeFromChoice } from "./logic";
import { StoredChoicesSchema, type PlaceChoice } from "./schema";
import type { CompareResult } from "./server";
import { COMPARE_STRINGS } from "./strings";
import Section from "@/components/ui/Section";

const ready = (c: PlaceChoice) => c.kind === "city" || c.query.trim().length >= 2;

/** Two places side by side. The last choices are remembered on this device. */
export default function Compare({ location, language }: { location: Location; language: Language }) {
  const t = COMPARE_STRINGS[language];
  const [choices, setChoices] = useStoredState("compare", StoredChoicesSchema, defaultChoices(location.city));
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResult(await fetchCompare({ a: placeFromChoice(choices.a), b: placeFromChoice(choices.b), language }));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? errorMessage(language, err.code, err.message) : errorMessage(language));
    } finally {
      setBusy(false);
    }
  }
  const summary = result && compareSummary(result.a, result.b, language);

  return (
    <Section title={t.heading}>
      <p className="mt-1 text-ink">{t.intro}</p>
      <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
        <ComparePlaceField n={1} choice={choices.a} onChange={(a) => setChoices((c) => ({ ...c, a }))} language={language} />
        <ComparePlaceField n={2} choice={choices.b} onChange={(b) => setChoices((c) => ({ ...c, b }))} language={language} />
        <div className="md:col-span-2">
          <button type="submit" disabled={busy || !ready(choices.a) || !ready(choices.b)} className="min-h-11 rounded-control bg-brand px-6 py-2 font-semibold text-brand-ink hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted disabled:border-line">
            {busy ? t.submitting : t.submit}
          </button>
          <p className="mt-2 text-xs text-ink-muted">{t.storage}</p>
        </div>
      </form>
      <div aria-live="polite" aria-busy={busy}>
        {error && <p role="alert" className="mt-3 rounded-control border border-danger bg-danger-soft p-3 text-danger-text">{error}</p>}
        {result && (
          <>
            {summary && <p className="mt-4 text-lg font-semibold">{summary}</p>}
            <ul className="mt-3 grid gap-4 md:grid-cols-2">
              <CompareCard side={result.a} language={language} />
              <CompareCard side={result.b} language={language} />
            </ul>
          </>
        )}
      </div>
    </Section>
  );
}
