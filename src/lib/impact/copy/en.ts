import type { FactCopy } from "./types";

const who = { kids: "your child", elderly: "elderly family members", respiratory: "your respiratory sensitivity", pets: "your pet" };

export const en: FactCopy = {
  reading: (d) => `${d.pollutant} ${d.value !== undefined ? `is ${d.value} µg/m³` : `sub-index is ${d.sub}`} (AQI ${d.aqi}, ${d.category}) at ${d.station}`,
  audience: (list) => (list.length ? `Because of ${list.map((k) => who[k]).join(", ")}` : "Everyone in your household"),
  timing: {
    action: (best, worst) => `Schedule outdoor errands, walks and exercise for ${best}${worst ? `; avoid ${worst}` : ""}.`,
    why: (reading) => `Right now ${reading}. Smoke builds up when the air near the ground stops mixing, and clears when it mixes again.`,
    impactMeasured: (d) => `${d.pct}% less PM2.5: over the last 24 h this station averaged ${d.bestAvg} µg/m³ during ${d.best} vs ${d.worstAvg} µg/m³ during ${d.worst}.`,
    impactDefault: "Afternoons are usually cleanest because the mixing layer is deepest (no hourly history at this station to quantify it).",
  },
  commuteOverlap: {
    action: (d) => `Your ${d.mode} commute runs through this station's dirtiest hours (${d.worst}). If your hours are flexible, travel in the cleaner window (${d.best}); otherwise ${d.open ? "wear a well-fitted N95/FFP2 mask and choose less congested side roads away from main junctions" : "keep windows shut and use AC recirculation"}.`,
    why: (d) => `You travel ${d.leave}–${d.arrive} (${d.leg === "home" ? "home" : "to work"}), inside the dirtiest window (${d.worst}), when this station averaged ${d.worstAvg} µg/m³ over the last 24 h.`,
    impact: (d) => `Travelling in ${d.best} (average ${d.bestAvg} µg/m³) instead would cut PM2.5 on this trip by ${d.pct}%, about ${d.micrograms} µg less inhaled${d.open ? `; an N95 mask removes at least ${d.n95}% of fine particles on top` : ""}.`,
    forYou: (mode, km) => `Your ${mode} commute, ${km} km`,
  },
  mask: {
    action: "Wear a well-fitted N95/FFP2 mask outdoors and on your commute (cloth and surgical masks do little for PM2.5).",
    why: (reading) => `${reading}, which is unhealthy to breathe for long periods.`,
    impact: (pct) => `Filters at least ${pct}% of 0.3 µm particles when sealed to the face (NIOSH N95 standard).`,
  },
  exercise: {
    action: "Move workouts and children's active play indoors until AQI improves.",
    why: (reading) => `Exercise makes you breathe deeper and faster while ${reading}.`,
    impact: (x) => `Moderate exercise inhales about ${x}× more air than sitting (US EPA Exposure Factors Handbook), so indoor exercise avoids most of that extra dose.`,
  },
  commuteExposure: {
    action: (to, from, km) => `Take the ${to} instead of ${from} for your ${km} km commute.`,
    why: (to) => `Enclosed ${to} travel had the lowest in-transit PM2.5 in Delhi measurements (Goel et al. 2015).`,
    impact: (pct) => `About ${pct}% less PM2.5 inhaled per trip.`,
    forYou: "Your daily commute",
  },
  purifier: {
    own: "Run your purifier on high in the bedroom with door and windows shut, especially overnight.",
    diy: (cost) => `Build a DIY purifier: a box fan with four MERV-13 filters taped into a cube (about ₹${cost}).`,
    hepa: (cadr) => `Buy a HEPA purifier with CADR ≥ ${cadr} m³/h for the room you sleep in.`,
    why: "Indian homes are leaky, so indoor PM2.5 tracks outdoor levels unless air is filtered.",
    impact: (pct, volume) => `Cuts bedroom PM2.5 by about ${pct}% at steady state (mass-balance model, ${volume} m³ room, windows shut).`,
  },
  ventilation: {
    action: (best) => `Air out rooms for 10–15 minutes during ${best}; keep windows shut otherwise.`,
    why: "You still need fresh air for CO₂ and humidity; timing it to the cleanest hours limits what comes in.",
    impactMeasured: (pct, worst) => `Lets in about ${pct}% less PM2.5 than airing out during ${worst} (this station, last 24 h).`,
    impactDefault: "Lets in less PM2.5 than airing out at night or early morning, when smoke is trapped near the ground.",
    forYou: "Your home",
  },
  cooking: {
    action: "Run the chimney/exhaust on high while cooking, use lids, and prefer back burners; avoid deep-frying with the house sealed.",
    why: "Frying and tadka create indoor PM2.5 spikes that can exceed outdoor smog.",
    impact: (pct, cfm) => `Hoods moving ≥ ${cfm} cfm capture over ${pct}% of cooking particles on front burners, more on back burners (Singer et al. 2012).`,
  },
  smoke: {
    action: "Skip mosquito coils, incense and dhoop indoors; use mesh screens or electric repellents.",
    why: "Burning anything indoors adds smoke on top of the outdoor smog you are trying to keep out.",
    impact: (low, high) => `One mosquito coil releases as much PM2.5 as ${low}–${high} cigarettes (Liu et al. 2003).`,
  },
  plants: {
    action: "Keep houseplants for wellbeing, but don't rely on them to clean the air.",
    why: "The popular 'air-purifying plants' claim comes from sealed-chamber tests that don't scale to homes.",
    impact: (low, high) => `Negligible: you would need ${low}–${high} plants per m² to match normal ventilation (Cummings & Waring 2020).`,
    forYou: "Your home",
  },
  transit: {
    action: (to, from) => `Commute by ${to} instead of ${from}.`,
    why: "Vehicle exhaust is a major share of winter PM2.5 and NO₂ in Indian cities; shared transport cuts both per person.",
    impact: (kg) => `Saves about ${kg.weeklyKg} kg CO₂ a week (${kg.yearlyKg} kg a year).`,
    forYou: (km) => `Your ${km} km commute`,
  },
  carpool: {
    action: "Carpool with one colleague or neighbour on days you must drive.",
    why: "Two people in one car halves the exhaust per person on the same road.",
    impact: (kg) => `Saves about ${kg.weeklyKg} kg CO₂ a week for you (${kg.yearlyKg} kg a year).`,
    forYou: (km) => `Your ${km} km drive`,
  },
  wfh: {
    action: (aqi) => `Ask to work from home on the worst smog days (AQI ${aqi} or higher).`,
    why: "Each skipped commute removes both your exhaust and your exposure for the day.",
    impact: (kg) => `One day a week saves about ${kg.weeklyKg} kg CO₂ (${kg.yearlyKg} kg a year) and two trips of exposure.`,
    forYou: "Your work schedule",
  },
  active: {
    action: (aqi, km) => `On cleaner days (AQI under ${aqi}), cycle or walk your ${km} km trip.`,
    why: "Short motorised trips emit the most per km because engines run cold.",
    impact: (w) => `Saves about ${w} kg CO₂ a week when done every workday.`,
    forYou: (km) => `Your ${km} km commute`,
  },
  burning: {
    action: "Compost leaves and garden waste instead of burning; report open burning on the CPCB Sameer app.",
    why: "Open burning of biomass and garbage is a major winter PM2.5 source in north India.",
    impact: (kg, g) => `Every ${kg} kg not burned avoids about ${g} g of PM2.5 (Akagi et al. 2011).`,
    forYou: "Your neighbourhood",
  },
};
