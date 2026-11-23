import { concentrationFromSubIndex } from "@/lib/aq/naqi";
import type { AQSnapshot } from "@/lib/aq/types";

// Kept apart from logic.ts: this runs in the first-load bundle (Toolbox), and logic.ts pulls in Zod.
/** Current PM2.5 for new manual trips: the measured value, or inferred from a CPCB sub-index, or null if unknown. */
export function ambientPm25(snapshot: AQSnapshot): number | null {
  if (snapshot.pollutants.pm25 !== undefined) return Math.round(snapshot.pollutants.pm25 * 10) / 10;
  const sub = snapshot.subIndices.pm25;
  return sub === undefined ? null : Math.round(concentrationFromSubIndex("pm25", sub) * 10) / 10;
}
