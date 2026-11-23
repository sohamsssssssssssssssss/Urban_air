import type { ReactNode } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/button";
import { SHELL } from "@/lib/i18n.shell";
import type { Language } from "@/lib/i18n";

/** Shown by sections that need the household when it is not known yet. */
export function NeedsSetup({ language }: { language: Language }) {
  const t = SHELL[language].empty;
  return <EmptyState title={t.title} body={t.body} action={<a href="#today" className={buttonClass("primary")}>{t.action}</a>} />;
}

/** Lazy-section placeholder with a fixed height so nothing jumps when the real card loads. */
export const Lazy = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-1 gap-6">{children}</div>;
