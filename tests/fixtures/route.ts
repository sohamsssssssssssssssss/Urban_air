import type { RouteResult } from "@/lib/route";
import type { RouteMode, ScoredRoute } from "@/lib/route/types";

const r = (mode: RouteMode, alt: number, pm25Ug: number, durationMin: number, over: Partial<ScoredRoute> = {}): ScoredRoute =>
  ({ id: `${mode}-${alt}`, mode, alt, distanceKm: 19.1, durationMin, pm25Ug, co2Kg: mode === "car" ? 2.48 : 0, ambientUgm3: 70, majorShare: 0, roadAdjustment: "not-applied", ...over });

/** A typical result: car is both cleanest and fastest on a long trip; walking is slowest. */
export const routeResult: RouteResult = {
  origin: { lat: 18.9156, lon: 72.8259, label: "Colaba Causeway, Mumbai" },
  destination: { lat: 19.0593, lon: 72.8613, label: "Bandra Kurla Complex, Mumbai" },
  departAt: "2026-11-22T12:00:00.000Z",
  approximate: false,
  air: { station: "Worli, Mumbai - MPCB", source: "OpenAQ", measuredAt: "2026-11-22T11:30:00.000Z", basis: "hourly-profile" },
  modes: [
    { mode: "walk", routes: [r("walk", 1, 348.1, 256), r("walk", 2, 370.4, 272, { majorShare: 0.01, roadAdjustment: "applied" })] },
    { mode: "cycle", routes: [r("cycle", 1, 170.2, 76), r("cycle", 2, 173.4, 78)] },
    { mode: "two_wheeler", routes: [r("two_wheeler", 1, 7.9, 21), r("two_wheeler", 2, 9, 23)] },
    { mode: "car", routes: [r("car", 1, 7.9, 21), r("car", 2, 9, 23)] },
  ],
  unavailableModes: [],
  cards: [
    { route: r("two_wheeler", 1, 7.9, 21), labels: ["cleanest", "fastest", "balance"], reason: "Lowest estimated PM2.5 inhaled (7.9 µg) and the quickest (21 min)." },
  ],
  reasonsBy: "computed",
  fallbackReason: "quota",
};
