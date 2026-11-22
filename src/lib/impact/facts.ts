import type { AQSnapshot } from "../aq/types";
import { POLLUTANT_LABEL } from "../aq/naqi";
import type { Fact } from "../ai/schema";
import { AQI_POOR, AQI_VERY_POOR, CLEANEST_WINDOW, DIY_CADR_M3H, DIY_PURIFIER_COST_INR, HEPA_CADR_M3H, LEAF_PILE_KG, MORNING_PEAK, MOSQUITO_COIL_CIGARETTES, N95_FILTRATION, RANGE_HOOD_CAPTURE } from "../constants";
import { MODE_LABEL, type CommuteMode, type UserProfile } from "../profile";
import { carpoolSavings, modeSwitchSavings, openBurningPm25Grams, wfhDaySavings } from "./emissions";
import { exerciseDoseMultiplier, modeDoseChangePct, purifierReductionPct, timingReductionPct } from "./exposure";

const PERCENT = 100;
const SHORT_TRIP_KM = 5;
const fmtHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
export const CLEAN_WINDOW_TEXT = `${fmtHour(CLEANEST_WINDOW.startHour)}–${fmtHour(CLEANEST_WINDOW.endHour)}`;
const PEAK_TEXT = `${fmtHour(MORNING_PEAK.startHour)}–${fmtHour(MORNING_PEAK.endHour)}`;

/** Who in the household a recommendation especially protects. */
function audience(p: UserProfile, include: Array<"kids" | "elderly" | "respiratory" | "pets">): string {
  const labels = { kids: "your child", elderly: "elderly family members", respiratory: "your respiratory sensitivity", pets: "your pet" };
  const who = include.filter((k) => p[k]).map((k) => labels[k]);
  return who.length ? `Because of ${who.join(", ")}` : "Everyone in your household";
}

/** Lowest-emission and lowest-exposure public option available in the user's city. */
const transitFor = (hasMetro: boolean): CommuteMode => (hasMetro ? "metro" : "bus");

/**
 * Builds every applicable recommendation with deterministic, sourced impact numbers.
 * Both the AI advisor and the rule-based fallback draw only from this list.
 * @param s - live air-quality snapshot
 * @param p - user profile
 * @param hasMetro - whether the user's city has a metro
 */
export function buildFacts(s: AQSnapshot, p: UserProfile, hasMetro: boolean): Fact[] {
  const sensitive = p.kids || p.elderly || p.respiratory;
  const poor = s.aqi >= AQI_POOR;
  const veryPoor = s.aqi >= AQI_VERY_POOR;
  const urgent = veryPoor || (poor && sensitive) ? "high" : "medium";
  const reading = `${POLLUTANT_LABEL[s.dominant]} is ${Math.round(s.pollutants[s.dominant] ?? 0)} µg/m³ (AQI ${s.aqi}, ${s.category}) at ${s.station.name}`;
  const facts: Fact[] = [];
  const add = (f: Fact) => facts.push(f);

  const commutesInPeak = p.workStartHour >= MORNING_PEAK.startHour && p.workStartHour < MORNING_PEAK.endHour;
  add({ id: "outdoor_timing", section: "routines", priority: poor ? "high" : "medium",
    action: `Schedule outdoor errands, walks and exercise for ${CLEAN_WINDOW_TEXT}; avoid ${PEAK_TEXT}.`,
    why: `Winter inversions trap smoke overnight; afternoon mixing dilutes it. Right now ${reading}.${commutesInPeak ? ` Your ${fmtHour(p.workStartHour)} start puts your commute in the morning peak.` : ""}`,
    impact: `About ${timingReductionPct()}% less PM2.5 than the same activity in the morning peak on a typical winter day.`,
    personalizedFor: audience(p, ["kids", "elderly", "pets"]) });

  if (poor || p.respiratory) add({ id: "n95_mask", section: "routines", priority: urgent,
    action: "Wear a well-fitted N95/FFP2 mask outdoors and on your commute (cloth and surgical masks do little for PM2.5).",
    why: `${reading}, which is unhealthy to breathe for long periods.`,
    impact: `Filters at least ${N95_FILTRATION * PERCENT}% of 0.3 µm particles when sealed to the face (NIOSH N95 standard).`,
    personalizedFor: audience(p, ["respiratory", "elderly"]) });

  if (poor || sensitive) add({ id: "exercise_indoors", section: "routines", priority: urgent,
    action: "Move workouts and children's active play indoors until AQI improves.",
    why: `Exercise makes you breathe deeper and faster while ${reading}.`,
    impact: `Moderate exercise inhales about ${exerciseDoseMultiplier()}× more air than rest (US EPA Exposure Factors Handbook), so indoor exercise avoids most of that extra dose.`,
    personalizedFor: audience(p, ["kids", "respiratory"]) });

  const transit = transitFor(hasMetro);
  const doseChange = p.commuteKm > 0 ? modeDoseChangePct(p.commuteMode, transit, p.commuteKm) : 0;
  if (doseChange < 0) add({ id: "commute_exposure", section: "routines", priority: poor ? "high" : "medium",
    action: `Take the ${MODE_LABEL[transit]} instead of ${MODE_LABEL[p.commuteMode]} for your ${p.commuteKm} km commute.`,
    why: `Enclosed ${MODE_LABEL[transit]} cars see lower in-transit PM2.5 than open-air road travel in Delhi measurements (Goel et al. 2015).`,
    impact: `About ${Math.abs(doseChange)}% less PM2.5 inhaled per trip.`,
    personalizedFor: "Your daily commute" });

  const purifierPct = purifierReductionPct(p.ownsPurifier || p.budget !== "low" ? HEPA_CADR_M3H : DIY_CADR_M3H);
  add({ id: "purifier", section: "indoor", priority: poor || sensitive ? "high" : "medium",
    action: p.ownsPurifier
      ? "Run your purifier on high in the bedroom with door and windows shut, especially overnight."
      : p.budget === "low"
        ? `Build a DIY purifier: a box fan with a MERV-13 filter taped to it (about ₹${DIY_PURIFIER_COST_INR.toLocaleString("en-IN")}).`
        : `Buy a HEPA purifier with CADR ≥ ${HEPA_CADR_M3H} m³/h for the room you sleep in.`,
    why: "Indian homes are leaky, so indoor PM2.5 tracks outdoor levels unless air is filtered.",
    impact: `Cuts bedroom PM2.5 by about ${purifierPct}% at steady state (mass-balance model, 36 m³ room, windows shut).`,
    personalizedFor: audience(p, ["kids", "elderly", "respiratory"]) });

  add({ id: "ventilation_timing", section: "indoor", priority: "medium",
    action: `Air out rooms for 10–15 minutes during ${CLEAN_WINDOW_TEXT}; keep windows shut at night and early morning.`,
    why: "You still need fresh air for CO₂ and humidity; timing it to the cleanest hours limits what comes in.",
    impact: `Lets in about ${timingReductionPct()}% less PM2.5 than airing out during the morning peak.`,
    personalizedFor: "Your home" });

  add({ id: "cooking_exhaust", section: "indoor", priority: "medium",
    action: "Run the chimney/exhaust fan while cooking, use lids, and prefer back burners; avoid deep-frying with the house sealed.",
    why: "Frying and tadka create indoor PM2.5 spikes that can exceed outdoor smog.",
    impact: `Exhaust hoods typically capture about ${RANGE_HOOD_CAPTURE * PERCENT}% of cooking particles (Singer et al. 2012).`,
    personalizedFor: audience(p, ["kids", "respiratory"]) });

  add({ id: "no_indoor_smoke", section: "indoor", priority: sensitive ? "high" : "medium",
    action: "Skip mosquito coils, incense and dhoop indoors; use mesh screens or electric repellents.",
    why: "Burning anything indoors adds smoke on top of the outdoor smog you are trying to keep out.",
    impact: `One mosquito coil emits as much PM2.5 as ${MOSQUITO_COIL_CIGARETTES.low}–${MOSQUITO_COIL_CIGARETTES.high} cigarettes (Liu et al. 2003).`,
    personalizedFor: audience(p, ["kids", "elderly", "pets"]) });

  add({ id: "plants_reality", section: "indoor", priority: "low",
    action: "Keep houseplants for wellbeing, but don't rely on them to clean the air.",
    why: "The popular 'air-purifying plants' claim comes from sealed-chamber tests that don't scale to homes.",
    impact: "Negligible: you would need 10–1,000 plants per m² to match normal ventilation (Cummings & Waring 2020).",
    personalizedFor: "Your home" });

  const switchSaving = p.commuteKm > 0 ? modeSwitchSavings(p.commuteMode, transit, p.commuteKm) : null;
  if (switchSaving && switchSaving.weeklyKg > 0) add({ id: "transit_switch", section: "alternatives", priority: "high",
    action: `Commute by ${MODE_LABEL[transit]} instead of ${MODE_LABEL[p.commuteMode]}.`,
    why: "Vehicle exhaust is a major share of winter PM2.5 and NO₂ in Indian cities; shared transport cuts both per person.",
    impact: `Saves about ${switchSaving.weeklyKg} kg CO₂ a week (${switchSaving.yearlyKg} kg a year).`,
    personalizedFor: `Your ${p.commuteKm} km commute` });

  if (p.commuteMode === "car" && p.commuteKm > 0) {
    const s2 = carpoolSavings(p.commuteKm);
    add({ id: "carpool", section: "alternatives", priority: "medium",
      action: "Carpool with one colleague or neighbour on days you must drive.",
      why: "Two people in one car halves the exhaust per person on the same road.",
      impact: `Saves about ${s2.weeklyKg} kg CO₂ a week for you (${s2.yearlyKg} kg a year).`,
      personalizedFor: `Your ${p.commuteKm} km drive` });
  }

  const wfh = p.commuteKm > 0 ? wfhDaySavings(p.commuteMode, p.commuteKm) : null;
  if (wfh && (wfh.weeklyKg > 0 || poor)) add({ id: "wfh_day", section: "alternatives", priority: poor ? "high" : "low",
    action: "Ask to work from home on the worst smog days (AQI above 300).",
    why: "Each skipped commute removes both your exhaust and your exposure for the day.",
    impact: `One day a week saves about ${wfh.weeklyKg} kg CO₂ (${wfh.yearlyKg} kg a year) and two trips of exposure.`,
    personalizedFor: "Your work schedule" });

  if (!poor && p.commuteKm > 0 && p.commuteKm <= SHORT_TRIP_KM && !["walk", "cycle"].includes(p.commuteMode)) {
    const active = modeSwitchSavings(p.commuteMode, "cycle", p.commuteKm);
    add({ id: "active_short_trips", section: "alternatives", priority: "low",
      action: `On cleaner days (AQI under ${AQI_POOR}), cycle or walk your ${p.commuteKm} km trip.`,
      why: "Short motorised trips emit the most per km because engines run cold.",
      impact: `Saves about ${active.weeklyKg} kg CO₂ a week when done every workday.`,
      personalizedFor: `Your ${p.commuteKm} km commute` });
  }

  add({ id: "no_burning", section: "alternatives", priority: "medium",
    action: "Compost leaves and garden waste instead of burning; report open burning on the CPCB Sameer app.",
    why: "Open burning of biomass and garbage is a major winter PM2.5 source in north India.",
    impact: `Every ${LEAF_PILE_KG} kg not burned avoids about ${openBurningPm25Grams(LEAF_PILE_KG)} g of PM2.5 (Akagi et al. 2011).`,
    personalizedFor: "Your neighbourhood" });

  return facts;
}
