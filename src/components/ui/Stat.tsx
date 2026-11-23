import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  className?: string;
}

/** A labelled figure: small caption, large tabular number, optional unit and hint. */
export default function Stat({ label, value, unit, hint, className }: StatProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5">
        <span className="text-2xl font-extrabold tabular-nums">{value}</span>
        {unit && <span className="ml-1 text-sm font-semibold text-ink-muted">{unit}</span>}
        {hint && <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span>}
      </dd>
    </div>
  );
}
