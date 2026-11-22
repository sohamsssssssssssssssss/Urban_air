import type { AQSnapshot } from "../aq/types";
import { HEALTH_IMPACT, POLLUTANT_LABEL } from "../aq/naqi";
import { formatIST } from "../format";
import { CLEAN_WINDOW_TEXT } from "../impact/facts";
import { PRIORITIES, SECTIONS, type Advice, type AdviceItem, type Fact } from "./schema";

const SEVERE_AQI = 401;

/**
 * Deterministic best time to be outdoors, based on the typical winter diurnal cycle and live category.
 */
export function bestOutdoorWindow(s: AQSnapshot): string {
  return s.aqi >= SEVERE_AQI
    ? `Avoid outdoor exertion today. If you must go out, ${CLEAN_WINDOW_TEXT} is usually the least polluted.`
    : `${CLEAN_WINDOW_TEXT}, usually the least polluted hours on winter days.`;
}

/** Plain-language summary citing the station and measurement time. */
export function ruleSummary(s: AQSnapshot): string {
  const stale = s.stale ? " This reading is more than 3 hours old." : "";
  return `AQI ${s.aqi} (${s.category}) at ${s.station.name}, measured ${formatIST(s.measuredAt)} via ${s.source}. Main pollutant: ${POLLUTANT_LABEL[s.dominant]}. ${HEALTH_IMPACT[s.category]}${stale}`;
}

const byPriority = (a: AdviceItem, b: AdviceItem) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);

/**
 * Rule-based advice built purely from computed facts. Works with zero AI.
 * @param s - live snapshot
 * @param facts - output of buildFacts
 */
export function ruleBasedAdvice(s: AQSnapshot, facts: Fact[]): Advice {
  const section = (name: (typeof SECTIONS)[number]) =>
    facts
      .filter((f) => f.section === name)
      .map(({ action, why, impact, personalizedFor, priority }) => ({ action, why, impact, personalizedFor, priority }))
      .sort(byPriority);
  return {
    summary: ruleSummary(s),
    bestOutdoorWindow: bestOutdoorWindow(s),
    routines: section("routines"),
    indoor: section("indoor"),
    alternatives: section("alternatives"),
  };
}
