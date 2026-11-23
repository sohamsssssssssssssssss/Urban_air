"use client";

import dynamic from "next/dynamic";
import type { AQSnapshot } from "@/lib/aq/types";
import type { Language } from "@/lib/i18n";
import type { UserProfile } from "@/lib/profile";

// Everything here is below the fold, so each section is a separate lazy chunk.
const Checklist = dynamic(() => import("./checklist/Checklist"), { loading: () => <p>…</p> });
const MaskGuide = dynamic(() => import("./mask/MaskGuide"), { loading: () => <p>…</p> });
const RoutePlanner = dynamic(() => import("@/components/RoutePlanner"), { loading: () => <p>…</p> });

export interface ToolboxProps {
  language: Language;
  /** Present once the live reading and household are known. */
  context?: { snapshot: AQSnapshot; profile: UserProfile };
}

/** The lazy-loaded tool sections under the plan. Sections that need the live reading appear once it exists. */
export default function Toolbox({ language, context }: ToolboxProps) {
  return (
    <>
      {context && <Checklist snapshot={context.snapshot} profile={context.profile} language={language} />}
      {context && <MaskGuide snapshot={context.snapshot} profile={context.profile} language={language} />}
      <RoutePlanner language={language} />
    </>
  );
}
