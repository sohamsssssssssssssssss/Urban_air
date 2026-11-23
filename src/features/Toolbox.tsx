"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { AQSnapshot } from "@/lib/aq/types";
import type { Language } from "@/lib/i18n";
import type { Location, UserProfile } from "@/lib/profile";
import { ambientPm25 } from "./tracker/ambient";
import type { TripDraft } from "./tracker/schema";

// Everything here is below the fold, so each section is a separate lazy chunk.
const Checklist = dynamic(() => import("./checklist/Checklist"), { loading: () => <p>…</p> });
const Outlook = dynamic(() => import("./outlook/Outlook"), { loading: () => <p>…</p> });
const Compare = dynamic(() => import("./compare/Compare"), { loading: () => <p>…</p> });
const Tracker = dynamic(() => import("./tracker/Tracker"), { loading: () => <p>…</p> });
const MaskGuide = dynamic(() => import("./mask/MaskGuide"), { loading: () => <p>…</p> });
const RoutePlanner = dynamic(() => import("@/components/RoutePlanner"), { loading: () => <p>…</p> });

export interface ToolboxProps {
  language: Language;
  /** Present once the live reading and household are known. */
  context?: { snapshot: AQSnapshot; profile: UserProfile; location: Location };
}

/** The lazy-loaded tool sections under the plan. Sections that need the live reading appear once it exists. */
export default function Toolbox({ language, context }: ToolboxProps) {
  // A route chosen in the planner prefills the tracker.
  const [draft, setDraft] = useState<TripDraft | null>(null);
  return (
    <>
      {context && <Checklist snapshot={context.snapshot} profile={context.profile} language={language} />}
      {context && <Outlook location={context.location} language={language} />}
      {context && <MaskGuide snapshot={context.snapshot} profile={context.profile} language={language} />}
      {context && <Compare location={context.location} language={language} />}
      <RoutePlanner language={language} onLogTrip={setDraft} />
      {/* keyed on the household mode so the starting baseline follows the profile when nothing is saved yet */}
      <Tracker key={context?.profile.commuteMode ?? "none"} language={language} defaultBaseline={context?.profile.commuteMode ?? "car"} ambientUgm3={context ? ambientPm25(context.snapshot) : null} draft={draft} />
    </>
  );
}
