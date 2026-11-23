import { useId } from "react";
import { cn } from "./cn";
import { sparklinePoints } from "./sparkMath";

export interface SparklineProps {
  values: number[];
  /** Accessible name, e.g. "PM2.5 over the last 22 hours". */
  title: string;
  /** Text alternative with the key readings (lowest, highest). */
  description: string;
  className?: string;
}

const W = 240;
const H = 56;

/** A small trend line. It is an image with a title and description; the same facts are also written as visible text nearby. */
export default function Sparkline({ values, title, description, className }: SparklineProps) {
  const id = useId();
  const points = sparklinePoints(values, W, H);
  if (points.length === 0) return null;
  const last = points[points.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} className={cn("h-14 w-full max-w-xs", className)}>
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{description}</desc>
      <polyline points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" className="stroke-aqi-accent" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4" className="fill-aqi-accent" />
    </svg>
  );
}
