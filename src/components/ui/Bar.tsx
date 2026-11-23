import { cn } from "./cn";

/** A thin inline bar for a percentage. Decorative: the number is always written next to it. */
export default function Bar({ percent, className }: { percent: number; className?: string }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <span aria-hidden="true" className={cn("block h-1.5 w-full overflow-hidden rounded-pill bg-sunken", className)}>
      <span className="block h-full rounded-pill bg-aqi-accent transition-[width] duration-base" style={{ width: `${width}%` }} />
    </span>
  );
}
