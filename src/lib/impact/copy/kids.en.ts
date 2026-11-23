import { en } from "./en";
import type { FactCopy } from "./types";

const who = { kids: "kids", elderly: "grandparents and older people", respiratory: "anyone who finds breathing hard", pets: "pets" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Kid-friendly wording for routine and indoor tips: short sentences, no technical terms. It implements the same
 * interface and receives the same numeric arguments as the standard copy, so every number is identical.
 * Alternatives (transit, carpool...) are adult decisions and keep the standard wording.
 */
export const kidsEn: FactCopy = {
  ...en,
  reading: (d) => `the air at ${d.station} is ${d.category} (AQI ${d.aqi})`,
  audience: (list) => (list.length ? `Extra important for ${list.map((k) => who[k]).join(", ")}` : "Good for everyone at home"),
  timing: {
    action: (best, worst) => `Go out to play between ${best}${worst ? `, and skip ${worst}` : ""}.`,
    why: (reading) => `Today ${reading}. Smoke sits low near the ground at some hours and floats away at others.`,
    impactMeasured: (d) => `${d.pct}% cleaner air: about ${d.bestAvg} between ${d.best} instead of ${d.worstAvg} between ${d.worst} (units of tiny dust, from this station over the last 24 hours).`,
    impactDefault: "Afternoons are usually the cleanest because the wind mixes the smoke up and away.",
  },
  commuteOverlap: {
    action: (d) => `Your trip by ${d.mode} goes through the dirtiest hours (${d.worst}). If you can, travel in ${d.best}; if not, ${d.open ? "grown-ups can wear a snug N95 mask and take quieter roads" : "keep the windows up and put the AC on recirculate"}.`,
    why: (d) => `You travel ${d.leave}–${d.arrive} (${d.leg === "home" ? "going home" : "going to work"}), when the air is dirtiest (${d.worst}): about ${d.worstAvg} units of tiny dust.`,
    impact: (d) => `Going in ${d.best} (about ${d.bestAvg} units) means ${d.pct}% less dirty air, roughly ${d.micrograms} µg less breathed in${d.open ? `; a snug N95 for grown-ups stops at least ${d.n95}% of the tiniest dust on top` : ""}.`,
    forYou: en.commuteOverlap.forYou,
  },
  mask: {
    action: "Grown-ups: wear a snug N95 mask outside. N95s are made for adults, so kids should spend less time outdoors instead.",
    why: (reading) => `${cap(reading)}, and breathing it for a long time is not good for you.`,
    impact: (pct) => `A snug N95 stops at least ${pct}% of the tiniest dust.`,
  },
  exercise: {
    action: "Play and exercise indoors until the air gets better.",
    why: (reading) => `Running and playing make you breathe faster and deeper, and ${reading}.`,
    impact: (x) => `Running and playing make you breathe about ${x} times as much air as sitting still, so playing inside keeps most of that dirty air out.`,
  },
  commuteExposure: {
    action: (to, from, km) => `Take the ${to} instead of the ${from} for your ${km} km trip.`,
    why: (to) => `Inside the ${to} you breathe less of the dirty street air.`,
    impact: (pct) => `You breathe about ${pct}% less dirty air on each trip.`,
    forYou: en.commuteExposure.forYou,
  },
  purifier: {
    own: "Keep your air cleaner on high in the bedroom with the door and windows shut, especially at night.",
    diy: (cost) => `Make a simple air cleaner: a box fan with four filters taped on like a cube (about ₹${cost}).`,
    hepa: (cadr) => `Get an air cleaner with a HEPA filter for the bedroom (look for a rating of ${cadr} or more).`,
    why: "Houses let outside air leak in, so the air inside is as dirty as outside unless it is cleaned.",
    impact: (pct, volume) => `It cleans about ${pct}% of the tiny dust out of a ${volume} cubic metre bedroom when the windows are shut.`,
  },
  ventilation: {
    action: (best) => `Open the windows for 10–15 minutes during ${best}, then shut them again.`,
    why: "We still need fresh air, so let it in at the cleanest time.",
    impactMeasured: (pct, worst) => `About ${pct}% less dirty air comes in than if you opened them during ${worst} (this station, last 24 hours).`,
    impactDefault: "Less dirty air comes in than at night or early morning, when smoke sits low.",
    forYou: en.ventilation.forYou,
  },
  cooking: {
    action: "Switch on the kitchen chimney or fan when cooking, use lids, and try not to fry with every window shut.",
    why: "Frying makes tiny dust inside the house, sometimes more than outside.",
    impact: (pct, cfm) => `A strong chimney (at least ${cfm} cfm) catches more than ${pct}% of the cooking smoke from the front burners, and even more from the back ones.`,
  },
  smoke: {
    action: "Please don't burn mosquito coils, incense or dhoop inside. Use a net or an electric repellent.",
    why: "Burning things inside adds smoke to the smoggy air you are trying to keep out.",
    impact: (low, high) => `One mosquito coil makes as much tiny dust as ${low} to ${high} cigarettes.`,
  },
  plants: {
    action: "Keep plants because they are nice, but they won't clean the air.",
    why: "The idea that plants clean the air comes from tiny sealed boxes, not from real rooms.",
    impact: (low, high) => `You would need ${low} to ${high} plants on every square metre to match an open window.`,
    forYou: en.plants.forYou,
  },
};
