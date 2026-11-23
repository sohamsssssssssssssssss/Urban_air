"use client";

import { useId, useState, type FormEvent } from "react";
import { CHAT_MAX_CHARS, CHAT_MAX_HISTORY, CHAT_MAX_TURN_CHARS } from "@/lib/constants";
import { UI, errorMessage, type Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
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
  const t = UI[language].chat;
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    const history = turns.slice(-CHAT_MAX_HISTORY).map(({ role, text }) => ({ role, text: text.slice(0, CHAT_MAX_TURN_CHARS) }));
    setTurns((prev) => [...prev, { role: "user", text: message }, { role: "model", text: "" }]);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      await streamChatAnswer({ location, profile, language, message, history }, (chunk) =>
        setTurns((prev) => prev.map((turn, i) => (i === prev.length - 1 ? { ...turn, text: turn.text + chunk } : turn))),
      );
    } catch (err) {
      setTurns((prev) => prev.slice(0, -2));
      setDraft(message);
      setError(err instanceof ApiError ? errorMessage(language, err.code, err.message) : errorMessage(language));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div role="log" aria-live="polite" aria-label={t.log}>
        <ol className="mt-3 grid gap-3">
        {turns.map((turn, i) => (
          <li key={i} className={turn.role === "user" ? "justify-self-end rounded-control bg-brand-soft p-3" : "rounded-control bg-sunken p-3"}>
            <span className="sr-only">{turn.role === "user" ? t.you : t.bot}</span>
            <p className="whitespace-pre-wrap">{turn.text || (busy && i === turns.length - 1 ? t.thinking : "")}</p>
          </li>
        ))}
        </ol>
      </div>
      <form onSubmit={send} className="mt-4">
        <label htmlFor={`${id}-msg`} className="block font-medium">{t.label}</label>
        <textarea
          id={`${id}-msg`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={CHAT_MAX_CHARS} rows={3}
          aria-describedby={`${id}-count${error ? ` ${id}-err` : ""}`} aria-invalid={error ? true : undefined}
          placeholder={t.placeholder}
          className="mt-1 block w-full rounded-control border border-line-strong p-3"
        />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p id={`${id}-count`} className="text-sm text-ink-muted">{t.count(draft.length, CHAT_MAX_CHARS)}</p>
          <button type="submit" disabled={busy || !draft.trim()} className="min-h-11 rounded-control bg-brand px-5 py-2 font-semibold text-brand-ink hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted disabled:border-line">
            {busy ? t.answering : t.ask}
          </button>
        </div>
        {error && <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-danger-text">{error}</p>}
      </form>
    </div>
  );
}
