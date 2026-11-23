import type { ReactNode } from "react";

/** Lets a wide table scroll sideways inside its own box (so the page never does). Focusable so keyboard users can scroll it. */
export default function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return <div role="region" aria-label={label} tabIndex={0} className="mt-4 overflow-x-auto">{children}</div>;
}
