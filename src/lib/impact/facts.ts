import type { AQSnapshot } from "../aq/types";
import { POLLUTANT_LABEL } from "../aq/naqi";
import type { Fact } from "../ai/schema";
import { AQI_POOR, AQI_VERY_POOR, DIY_CADR_M3H, DIY_PURIFIER_COST_INR, HEPA_CADR_M3H, LEAF_PILE_KG, MOSQUITO_COIL_CIGARETTES, N95_FILTRATION, PLANTS_PER_M2, RANGE_HOOD_CAPTURE, RANGE_HOOD_FLOW_CFM, ROOM_VOLUME_M3 } from "../constants";
import { CATEGORY_LABEL, MODE_NAME, type Language } from "../i18n";
import type { CommuteMode, UserProfile } from "../profile";
import { en } from "./copy/en";
import { hi } from "./copy/hi";
import type { FactCopy } from "./copy/types";
import { carpoolSavings, modeSwitchSavings, openBurningPm25Grams, wfhDaySavings } from "./emissions";
import { exerciseDoseMultiplier, modeDoseChangePct, purifierReductionPct, tripDose } from "./exposure";
import { commuteOverlap, formatWindow, timingFromHistory } from "./timing";

const COPY: Record<Language, FactCopy> = { en, hi };
const PERCENT = 100;
const SHORT_TRIP_KM = 5;
const OPEN_AIR_MODES: readonly CommuteMode[] = ["walk", "cycle", "two_wheeler", "auto"];

/**
 * Builds every applicable recommendation with deterministic, sourced impact numbers, in the
 * requested language. Both the AI advisor and the rule-based fallback draw only from this list.
 * @param s - live air-quality snapshot
 * @param p - user profile
 * @param hasMetro - whether the user's city has a metro
 * @param lang - output language
 */
export function buildFacts(s: AQSnapshot, p: UserProfile, hasMetro: boolean, lang: Language = "en"): Fact[] {
  const c = COPY[lang];
  const mode = MODE_NAME[lang];
  const sensitive = p.kids || p.elderly || p.respiratory;
  const poor = s.aqi >= AQI_POOR;
  const urgent = s.aqi >= AQI_VERY_POOR || (poor && sensitive) ? "high" : "medium";
  const conc = s.pollutants[s.dominant];
  const reading = c.reading({ pollutant: POLLUTANT_LABEL[s.dominant], value: conc === undefined ? undefined : Math.round(conc), sub: s.subIndices[s.dominant] ?? s.aqi, aqi: s.aqi, category: CATEGORY_LABEL[lang][s.category], station: s.station.name });
  const audience = (keys: Parameters<FactCopy["audience"]>[0]) => c.audience(keys.filter((k) => p[k]));
  const facts: Fact[] = [];
  const add = (f: Fact) => facts.push(f);

  const timing = timingFromHistory(s.history);
  const best = formatWindow(timing.best);
  const worst = timing.worst && formatWindow(timing.worst);
  add({ id: "outdoor_timing", section: "routines", priority: poor ? "high" : "medium",
    action: c.timing.action(best, worst),
    why: c.timing.why(reading),
    impact: timing.measured && timing.worst && worst
      ? c.timing.impactMeasured({ pct: timing.reductionPct ?? 0, best, bestAvg: timing.best.avg ?? 0, worst, worstAvg: timing.worst.avg ?? 0 })
      : c.timing.impactDefault,
    personalizedFor: audience(["kids", "elderly", "pets"]) });

  const overlap = commuteOverlap(timing.worst, p);
  if (overlap && timing.worst) {
    const open = OPEN_AIR_MODES.includes(p.commuteMode);
    const bestAvg = timing.best.avg ?? 0;
    const worstAvg = timing.worst.avg ?? 0;
    add({ id: "commute_overlap", section: "routines", priority: poor ? "high" : "medium",
      action: c.commuteOverlap.action({ open, mode: mode[p.commuteMode], worst: worst ?? "", best }),
      why: c.commuteOverlap.why({ leg: overlap.leg, leave: overlap.leave, arrive: overlap.arrive, worst: worst ?? "", worstAvg }),
      impact: c.commuteOverlap.impact({ pct: timing.reductionPct ?? 0, best, bestAvg, micrograms: Math.round(tripDose(p.commuteMode, p.commuteKm) * (worstAvg - bestAvg) * 10) / 10, open, n95: N95_FILTRATION * PERCENT }),
      personalizedFor: c.commuteOverlap.forYou(mode[p.commuteMode], p.commuteKm) });
  }

  if (poor || p.respiratory) add({ id: "n95_mask", section: "routines", priority: urgent,
    action: c.mask.action, why: c.mask.why(reading), impact: c.mask.impact(N95_FILTRATION * PERCENT), personalizedFor: audience(["respiratory", "elderly"]) });

  if (poor || sensitive) add({ id: "exercise_indoors", section: "routines", priority: urgent,
    action: c.exercise.action, why: c.exercise.why(reading), impact: c.exercise.impact(exerciseDoseMultiplier()), personalizedFor: audience(["kids", "respiratory"]) });

  const transit: CommuteMode = hasMetro ? "metro" : "bus";
  const doseChange = p.commuteKm > 0 ? modeDoseChangePct(p.commuteMode, transit, p.commuteKm) : 0;
  if (doseChange < 0) add({ id: "commute_exposure", section: "routines", priority: poor ? "high" : "medium",
    action: c.commuteExposure.action(mode[transit], mode[p.commuteMode], p.commuteKm), why: c.commuteExposure.why(mode[transit]),
    impact: c.commuteExposure.impact(Math.abs(doseChange)), personalizedFor: c.commuteExposure.forYou });

  const cadr = p.ownsPurifier || p.budget !== "low" ? HEPA_CADR_M3H : DIY_CADR_M3H;
  add({ id: "purifier", section: "indoor", priority: poor || sensitive ? "high" : "medium",
    action: p.ownsPurifier ? c.purifier.own : p.budget === "low" ? c.purifier.diy(DIY_PURIFIER_COST_INR.toLocaleString("en-IN")) : c.purifier.hepa(HEPA_CADR_M3H),
    why: c.purifier.why, impact: c.purifier.impact(purifierReductionPct(cadr), ROOM_VOLUME_M3), personalizedFor: audience(["kids", "elderly", "respiratory"]) });

  add({ id: "ventilation_timing", section: "indoor", priority: "medium",
    action: c.ventilation.action(best), why: c.ventilation.why,
    impact: timing.measured && worst ? c.ventilation.impactMeasured(timing.reductionPct ?? 0, worst) : c.ventilation.impactDefault,
    personalizedFor: c.ventilation.forYou });

  add({ id: "cooking_exhaust", section: "indoor", priority: "medium",
    action: c.cooking.action, why: c.cooking.why, impact: c.cooking.impact(RANGE_HOOD_CAPTURE * PERCENT, RANGE_HOOD_FLOW_CFM), personalizedFor: audience(["kids", "respiratory"]) });

  add({ id: "no_indoor_smoke", section: "indoor", priority: sensitive ? "high" : "medium",
    action: c.smoke.action, why: c.smoke.why, impact: c.smoke.impact(MOSQUITO_COIL_CIGARETTES.low, MOSQUITO_COIL_CIGARETTES.high), personalizedFor: audience(["kids", "elderly", "pets"]) });

  add({ id: "plants_reality", section: "indoor", priority: "low",
    action: c.plants.action, why: c.plants.why, impact: c.plants.impact(PLANTS_PER_M2.low, PLANTS_PER_M2.high), personalizedFor: c.plants.forYou });

  const switchSaving = p.commuteKm > 0 ? modeSwitchSavings(p.commuteMode, transit, p.commuteKm) : null;
  if (switchSaving && switchSaving.weeklyKg > 0) add({ id: "transit_switch", section: "alternatives", priority: "high",
    action: c.transit.action(mode[transit], mode[p.commuteMode]), why: c.transit.why, impact: c.transit.impact(switchSaving), personalizedFor: c.transit.forYou(p.commuteKm) });

  if (p.commuteMode === "car" && p.commuteKm > 0) add({ id: "carpool", section: "alternatives", priority: "medium",
    action: c.carpool.action, why: c.carpool.why, impact: c.carpool.impact(carpoolSavings(p.commuteKm)), personalizedFor: c.carpool.forYou(p.commuteKm) });

  const wfh = p.commuteKm > 0 ? wfhDaySavings(p.commuteMode, p.commuteKm) : null;
  if (wfh && (wfh.weeklyKg > 0 || poor)) add({ id: "wfh_day", section: "alternatives", priority: poor ? "high" : "low",
    action: c.wfh.action(AQI_VERY_POOR), why: c.wfh.why, impact: c.wfh.impact(wfh), personalizedFor: c.wfh.forYou });

  if (!poor && p.commuteKm > 0 && p.commuteKm <= SHORT_TRIP_KM && p.commuteMode !== "walk" && p.commuteMode !== "cycle") add({ id: "active_short_trips", section: "alternatives", priority: "low",
    action: c.active.action(AQI_POOR, p.commuteKm), why: c.active.why, impact: c.active.impact(modeSwitchSavings(p.commuteMode, "cycle", p.commuteKm).weeklyKg), personalizedFor: c.active.forYou(p.commuteKm) });

  add({ id: "no_burning", section: "alternatives", priority: "medium",
    action: c.burning.action, why: c.burning.why, impact: c.burning.impact(LEAF_PILE_KG, openBurningPm25Grams(LEAF_PILE_KG)), personalizedFor: c.burning.forYou });

  return facts;
}
