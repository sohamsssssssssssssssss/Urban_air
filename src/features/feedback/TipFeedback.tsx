"use client";

import { useEffect, useState } from "react";
import { postFeedback } from "@/components/apiClient";
import type { Language } from "@/lib/i18n";
import type { Vote } from "./constants";
import { FEEDBACK_STRINGS } from "./strings";
import { readVotes, saveVote } from "./votes";

const btn = "min-h-11 rounded-md border px-4 py-2 text-sm font-medium";

/** Helpful / Not useful for one tip. The vote is kept on this device; only {tipId, vote} is sent, once per change. */
export default function TipFeedback({ tipId, language }: { tipId: string; language: Language }) {
  const t = FEEDBACK_STRINGS[language];
  const [vote, setVote] = useState<Vote | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => setVote(readVotes()[tipId] ?? null), [tipId]);

  function choose(next: Vote) {
    const value = vote === next ? null : next; // pressing the active button takes the vote back
    setVote(value);
    saveVote(tipId, value);
    setSent(value !== null);
    if (value !== null) postFeedback({ tipId, vote: value });
  }

  return (
    <div role="group" aria-label={t.group} className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-700">{t.group}</span>
      {([["up", t.helpful], ["down", t.notUseful]] as const).map(([value, label]) => (
        <button key={value} type="button" aria-pressed={vote === value} onClick={() => choose(value)} className={`${btn} ${vote === value ? "border-blue-800 bg-blue-100 text-blue-950" : "border-slate-400 text-slate-900 hover:bg-slate-100"}`}>
          {label}
        </button>
      ))}
      <span aria-live="polite" className="text-xs text-slate-700">{sent ? t.thanks : ""}</span>
    </div>
  );
}
