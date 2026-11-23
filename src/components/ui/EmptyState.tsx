import type { ReactNode } from "react";
import Card from "./Card";

export interface EmptyStateProps {
  title: string;
  body: string;
  /** The one clear next step (a button or link). */
  action?: ReactNode;
  /** "error" uses an alert role so assistive tech announces it. */
  kind?: "empty" | "error";
}

/** A friendly empty or error state with a single action. */
export default function EmptyState({ title, body, action, kind = "empty" }: EmptyStateProps) {
  return (
    <Card tone="sunken" className="p-6 text-center">
      <div role={kind === "error" ? "alert" : undefined}>
        <p className="text-lg font-bold">{title}</p>
        <p className="mx-auto mt-1 max-w-prose text-ink-muted">{body}</p>
      </div>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}
