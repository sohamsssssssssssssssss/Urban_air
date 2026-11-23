import type { SectionId } from "./sections";

const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;

/** Navigation icons. Decorative: every one sits next to a text label. */
export function NavIcon({ id }: { id: SectionId }) {
  switch (id) {
    case "today":
      return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "plan":
      return <svg {...common}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17" /></svg>;
    case "routes":
      return <svg {...common}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6" /></svg>;
    case "outlook":
      return <svg {...common}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></svg>;
    case "me":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
  }
}

/** The SmogSense mark (same shapes as the app icon). */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={className}>
      <rect width="64" height="64" rx="13" className="fill-ink" />
      <path d="M48 13c0 20-9 32-23 32-7 0-11-5-11-11 0-13 15-20 34-21Z" className="fill-aqi-accent" />
      <path d="M13 50c6-11 15-18 26-25" fill="none" className="stroke-canvas" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
