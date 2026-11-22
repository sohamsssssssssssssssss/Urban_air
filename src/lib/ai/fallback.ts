import type { AQSnapshot } from "../aq/types";
import { POLLUTANT_LABEL } from "../aq/naqi";
import { AQI_SEVERE } from "../constants";
import { formatIST } from "../format";
import { CATEGORY_LABEL, HEALTH_IMPACT, type Language } from "../i18n";
import { formatWindow, timingFromHistory } from "../impact/timing";
import { PRIORITIES, SECTIONS, type Advice, type AdviceItem, type Fact } from "./schema";

const TEXT: Record<Language, {
  severe: string;
  measured: (w: string, avg: number) => string;
  typical: (w: string) => string;
  stale: string;
  summary: (d: { aqi: number; cat: string; station: string; time: string; source: string; dom: string; health: string }) => string;
}> = {
  en: {
    severe: "Avoid outdoor exertion today. If you must go out: ",
    measured: (w, avg) => `${w} (lowest PM2.5 at this station over the last 24 h, ${avg} µg/m³).`,
    typical: (w) => `${w}, usually the least polluted hours as the afternoon air mixes.`,
    stale: " This reading is more than 3 hours old.",
    summary: (d) => `AQI ${d.aqi} (${d.cat}) at ${d.station}, measured ${d.time} via ${d.source}. Main pollutant: ${d.dom}. ${d.health}`,
  },
  hi: {
    severe: "आज बाहर ज़ोरदार गतिविधि से बचें। अगर जाना ही हो: ",
    measured: (w, avg) => `${w} (पिछले 24 घंटों में इस स्टेशन पर सबसे कम PM2.5, ${avg} µg/m³)।`,
    typical: (w) => `${w}, दोपहर में हवा मिलने से आम तौर पर सबसे कम प्रदूषण।`,
    stale: " यह रीडिंग 3 घंटे से ज़्यादा पुरानी है।",
    summary: (d) => `${d.station} पर AQI ${d.aqi} (${d.cat}), ${d.time} पर ${d.source} से मापा गया। मुख्य प्रदूषक: ${d.dom}। ${d.health}`,
  },
};

/**
 * Deterministic best time to be outdoors: the station's measured cleanest window when history
 * exists, else the documented default afternoon window. Severe days get an explicit warning.
 */
export function bestOutdoorWindow(s: AQSnapshot, lang: Language = "en"): string {
  const t = TEXT[lang];
  const timing = timingFromHistory(s.history);
  const w = formatWindow(timing.best);
  const text = timing.measured ? t.measured(w, timing.best.avg ?? 0) : t.typical(w);
  return s.aqi >= AQI_SEVERE ? t.severe + text : text;
}

/** Plain-language summary citing the station and measurement time. */
export function ruleSummary(s: AQSnapshot, lang: Language = "en"): string {
  const t = TEXT[lang];
  const summary = t.summary({ aqi: s.aqi, cat: CATEGORY_LABEL[lang][s.category], station: s.station.name, time: formatIST(s.measuredAt), source: s.source, dom: POLLUTANT_LABEL[s.dominant], health: HEALTH_IMPACT[lang][s.category] });
  return s.stale ? summary + t.stale : summary;
}

const byPriority = (a: AdviceItem, b: AdviceItem) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);

/**
 * Rule-based advice built purely from computed facts. Works with zero AI.
 * @param s - live snapshot
 * @param facts - output of buildFacts (already in the target language)
 * @param lang - output language for summary and window
 */
export function ruleBasedAdvice(s: AQSnapshot, facts: Fact[], lang: Language = "en"): Advice {
  const section = (name: (typeof SECTIONS)[number]) =>
    facts
      .filter((f) => f.section === name)
      .map(({ action, why, impact, personalizedFor, priority }) => ({ action, why, impact, personalizedFor, priority }))
      .sort(byPriority);
  return { summary: ruleSummary(s, lang), bestOutdoorWindow: bestOutdoorWindow(s, lang), routines: section("routines"), indoor: section("indoor"), alternatives: section("alternatives") };
}
