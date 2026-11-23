"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SHELL } from "@/lib/i18n.shell";
import type { Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
import { cn } from "../ui/cn";
import Dialog from "../ui/Dialog";
import Skeleton from "../ui/Skeleton";

// The conversation UI loads the first time the dialog opens.
const ChatPanel = dynamic(() => import("../ChatPanel"), { loading: () => <Skeleton className="h-48" /> });

export interface ChatDialogProps {
  location: Location;
  profile: UserProfile;
  language: Language;
}

/** A floating "Ask" button on every section that opens the chat as an accessible modal dialog. */
export default function ChatDialog({ location, profile, language }: ChatDialogProps) {
  const [open, setOpen] = useState(false);
  const t = SHELL[language];
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={cn("fixed bottom-20 right-4 z-20 inline-flex min-h-12 items-center gap-2 rounded-pill border border-brand bg-brand px-5 font-bold text-brand-ink shadow-raised transition-colors duration-fast hover:bg-brand-hover lg:bottom-6 lg:right-6")}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
        {t.ask}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t.askTitle} closeLabel={t.askClose}>
        {open && <ChatPanel location={location} profile={profile} language={language} />}
      </Dialog>
    </>
  );
}
