import type { Language } from "../i18n";
import { ROUTE_LABELS, type RouteCard, type RouteLabel, type ScoredRoute } from "./types";

const PERCENT = 100;

interface Numbers {
  ug: number;
  min: number;
  /** % less PM2.5 than the fastest route (cleanest) or % more than the cleanest (fastest, balance). */
  pct: number;
  /** Minutes longer than the fastest route. */
  extraMin: number;
}

/** Deterministic one-line reasons. Every figure is passed in, so both languages carry identical numbers. */
const TEXT: Record<Language, { both: (n: Numbers) => string; cleanest: (n: Numbers) => string; fastest: (n: Numbers) => string; balance: (n: Numbers) => string }> = {
  en: {
    both: (n) => `Lowest estimated PM2.5 inhaled (${n.ug} µg) and the quickest (${n.min} min).`,
    cleanest: (n) => `Lowest estimated PM2.5 inhaled (${n.ug} µg): ${n.pct}% less than the fastest option, for ${n.extraMin} min more.`,
    fastest: (n) => `Quickest at ${n.min} min, inhaling an estimated ${n.ug} µg (${n.pct}% more than the cleanest option).`,
    balance: (n) => `Best trade-off: an estimated ${n.ug} µg inhaled (${n.pct}% above the cleanest) in ${n.min} min (${n.extraMin} min longer than the fastest).`,
  },
  hi: {
    both: (n) => `सांस में जाने वाला अनुमानित PM2.5 सबसे कम (${n.ug} µg) और सबसे तेज़ भी (${n.min} मिनट)।`,
    cleanest: (n) => `अनुमानित PM2.5 सबसे कम (${n.ug} µg): सबसे तेज़ विकल्प से ${n.pct}% कम, ${n.extraMin} मिनट ज़्यादा में।`,
    fastest: (n) => `${n.min} मिनट में सबसे तेज़, अनुमानित ${n.ug} µg PM2.5 सांस में (सबसे साफ़ विकल्प से ${n.pct}% ज़्यादा)।`,
    balance: (n) => `सबसे संतुलित: अनुमानित ${n.ug} µg PM2.5 (सबसे साफ़ से ${n.pct}% ज़्यादा), ${n.min} मिनट में (सबसे तेज़ से ${n.extraMin} मिनट ज़्यादा)।`,
  },
};

const pctDiff = (a: number, b: number) => (b > 0 ? Math.max(0, Math.round((a / b - 1) * PERCENT)) : 0);

/**
 * Groups labels by route and writes the computed one-line reason for each distinct route.
 * @param labelled - output of `labelRoutes`
 * @param lang - output language
 */
export function buildCards(labelled: Record<RouteLabel, ScoredRoute>, lang: Language): RouteCard[] {
  const { cleanest, fastest } = labelled;
  const t = TEXT[lang];
  const cards: RouteCard[] = [];
  for (const label of ROUTE_LABELS) {
    const route = labelled[label];
    const existing = cards.find((c) => c.route.id === route.id);
    if (existing) {
      existing.labels.push(label);
      continue;
    }
    cards.push({ route, labels: [label], reason: "" });
  }
  for (const card of cards) {
    const r = card.route;
    const n: Numbers = { ug: r.pm25Ug, min: r.durationMin, pct: 0, extraMin: Math.max(0, r.durationMin - fastest.durationMin) };
    const [primary] = card.labels;
    if (card.labels.includes("cleanest") && card.labels.includes("fastest")) card.reason = t.both(n);
    else if (primary === "cleanest") card.reason = t.cleanest({ ...n, pct: Math.max(0, Math.round((1 - r.pm25Ug / (fastest.pm25Ug || 1)) * PERCENT)) });
    else if (primary === "fastest") card.reason = t.fastest({ ...n, pct: pctDiff(r.pm25Ug, cleanest.pm25Ug) });
    else card.reason = t.balance({ ...n, pct: pctDiff(r.pm25Ug, cleanest.pm25Ug) });
  }
  return cards;
}
