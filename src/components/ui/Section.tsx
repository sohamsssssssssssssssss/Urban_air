import { useId, type ReactNode } from "react";
import { cn } from "./cn";

export interface SectionProps {
  title: string;
  /** Short line under the title. */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Extra attributes for assistive tech, e.g. aria-busy while loading. */
  busy?: boolean;
  /** Controls on the right of the title row. */
  actions?: ReactNode;
}

/**
 * A card with a heading, exposed as a landmark region named by that heading.
 * Headings inside the page shell are h2 (the section title in the shell is the one h1).
 */
export default function Section({ title, description, children, className, busy, actions }: SectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-h`} aria-busy={busy || undefined} className={cn("rounded-card border border-line bg-surface p-5 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`${id}-h`} className="text-xl font-bold tracking-tight">{title}</h3>
          {description && <p className="mt-1 text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
