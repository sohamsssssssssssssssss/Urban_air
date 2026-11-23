import { cn } from "./cn";

/** A placeholder block with a gentle pulse (off under prefers-reduced-motion). Give it the final element's size to avoid layout shift. */
export default function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-control bg-sunken motion-reduce:animate-none", className)} />;
}
