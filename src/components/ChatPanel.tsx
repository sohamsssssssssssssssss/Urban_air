"use client";

import { useId, useState, type FormEvent } from "react";
import { CHAT_MAX_CHARS, CHAT_MAX_HISTORY } from "@/lib/constants";
import type { Language, Location, UserProfile } from "@/lib/profile";
import type { ChatTurn } from "@/lib/requests";
import { ApiError, streamChatAnswer } from "./apiClient";

export interface ChatPanelProps {
  location: Location;
  profile: UserProfile;
  language: Language;
}

/** Follow-up Q&A grounded on the same live reading. Answers stream into a polite live region. */
export default function ChatPanel({ location, profile, language }: ChatPanelProps) {
  const id = useId();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    const history = turns.slice(-CHAT_MAX_HISTORY);
    setTurns((t) => [...t, { role: "user", text: message }, { role: "model", text: "" }]);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      await streamChatAnswer({ location, profile, language, message, history }, (chunk) =>
        setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, text: turn.text + chunk } : turn))),
      );
    } catch (err) {
      setTurns((t) => t.slice(0, -2));
      setDraft(message);
      setError(err instanceof ApiError ? err.message : "Couldn't reach the assistant. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id={`${id}-h`} className="text-xl font-semibold">Ask a follow-up</h2>
      <div role="log" aria-live="polite" aria-label="Conversation" lang={language}>
        <ol className="mt-3 grid gap-3">
        {turns.map((t, i) => (
          <li key={i} className={t.role === "user" ? "justify-self-end rounded-lg bg-blue-50 p-3" : "rounded-lg bg-slate-100 p-3"}>
            <span className="sr-only">{t.role === "user" ? "You said: " : "SmogSense: "}</span>
            <p className="whitespace-pre-wrap">{t.text || (busy && i === turns.length - 1 ? "Thinking…" : "")}</p>
          </li>
        ))}
        </ol>
      </div>
      <form onSubmit={send} className="mt-4">
        <label htmlFor={`${id}-msg`} className="block font-medium">Your question</label>
        <textarea
          id={`${id}-msg`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={CHAT_MAX_CHARS} rows={3}
          aria-describedby={`${id}-count${error ? ` ${id}-err` : ""}`} aria-invalid={error ? true : undefined}
          placeholder="e.g. Is it safe to take my kids to the park this evening?"
          className="mt-1 block w-full rounded-md border border-slate-500 p-3"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p id={`${id}-count`} className="text-sm text-slate-700">{draft.length}/{CHAT_MAX_CHARS} characters</p>
          <button type="submit" disabled={busy || !draft.trim()} className="min-h-11 rounded-md bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-500">
            {busy ? "Answering…" : "Ask"}
          </button>
        </div>
        {error && <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-red-800">{error}</p>}
      </form>
    </section>
  );
}
