import type { ReactNode } from "react";
import { cn } from "./cn";

export type PillTone = "neutral" | "brand" | "ok" | "warn" | "danger";
const TONES: Record<PillTone, string> = {
  neutral: "border-line-strong bg-sunken text-ink",
  brand: "border-brand bg-brand-soft text-brand-text",
  ok: "border-ok bg-ok-soft text-ok-text",
  warn: "border-warn bg-warn-soft text-warn-text",
  danger: "border-danger bg-danger-soft text-danger-text",
};
/** A leading glyph so a pill's meaning never depends on colour alone. */
const GLYPH: Record<PillTone, string> = { neutral: "●", brand: "◆", ok: "✓", warn: "▲", danger: "■" };

/** A small label with a border, a glyph and text. */
export default function Pill({ tone = "neutral", children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-bold", TONES[tone], className)}>
      <span aria-hidden="true">{GLYPH[tone]}</span>
      {children}
    </span>
  );
}
