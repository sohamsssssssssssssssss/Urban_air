import type { Language } from "./i18n";
import type { RouteLabel } from "./route/types";

export interface RouteStrings {
  heading: string;
  intro: string;
  from: string;
  to: string;
  placeholderFrom: string;
  placeholderTo: string;
  leave: string;
  leaveHint: string;
  submit: string;
  submitting: string;
  estimatedNote: string;
  approximate: string;
  basis: { "hourly-profile": (station: string) => string; latest: (station: string) => string; "sub-index": (station: string) => string };
  labels: Record<RouteLabel, string>;
  duration: string;
  distance: string;
  pm25: string;
  co2: string;
  min: string;
  km: string;
  ug: string;
  kg: string;
  tableCaption: string;
  mode: string;
  route: string;
  roads: string;
  roadApplied: (pct: number) => string;
  roadNot: string;
  twoWheelerNote: string;
  noneFor: (modes: string) => string;
  computedNote: (reason: string) => string;
  attribution: string;
}

const en: RouteStrings = {
  heading: "Cleaner routes",
  intro: "Pick where you're going and see which route and mode expose you to the least PM2.5, not just the fastest.",
  from: "From",
  to: "To",
  placeholderFrom: "e.g. Colaba Causeway, Mumbai",
  placeholderTo: "e.g. Bandra Kurla Complex, Mumbai",
  leave: "Leave at (optional)",
  leaveHint: "Empty means now. Pollution changes through the day.",
  submit: "Find routes",
  submitting: "Finding routes…",
  estimatedNote: "Exposure is estimated from the nearest monitor's last 24 hours, not measured on the route.",
  approximate: "Approximate: no reference monitor within 25 km of the start, or only a sub-index was available.",
  basis: {
    "hourly-profile": (s) => `Uses ${s}'s last-24 h pattern for your travel time.`,
    latest: (s) => `No hourly pattern at ${s}; uses its latest reading.`,
    "sub-index": (s) => `Inferred from the CPCB sub-index at ${s}.`,
  },
  labels: { cleanest: "Cleanest air", fastest: "Fastest", balance: "Best balance" },
  duration: "Duration",
  distance: "Distance",
  pm25: "Est. PM2.5 inhaled",
  co2: "Est. CO₂",
  min: "min",
  km: "km",
  ug: "µg",
  kg: "kg",
  tableCaption: "All routes by mode (best first)",
  mode: "Mode",
  route: "Route",
  roads: "Road data",
  roadApplied: (pct) => `main-road adjustment applied (${pct}% of route)`,
  roadNot: "not applied (OSRM gave no road class)",
  twoWheelerNote: "Two-wheelers use the car road network and car travel times.",
  noneFor: (modes) => `No route found for: ${modes}.`,
  computedNote: (reason) => `Reasons written from the computed numbers (${reason}).`,
  attribution: "Places and routes © OpenStreetMap contributors (Nominatim, OSRM).",
};

const hi: RouteStrings = {
  heading: "साफ़ हवा वाले रास्ते",
  intro: "कहाँ जाना है चुनें और देखें कि कौन सा रास्ता और साधन सबसे कम PM2.5 वाली हवा में ले जाता है, सिर्फ़ सबसे तेज़ नहीं।",
  from: "कहाँ से",
  to: "कहाँ तक",
  placeholderFrom: "जैसे: कोलाबा कॉज़वे, मुंबई",
  placeholderTo: "जैसे: बांद्रा कुर्ला कॉम्प्लेक्स, मुंबई",
  leave: "रवानगी का समय (वैकल्पिक)",
  leaveHint: "खाली का मतलब अभी। दिन भर प्रदूषण बदलता रहता है।",
  submit: "रास्ते खोजें",
  submitting: "रास्ते खोजे जा रहे हैं…",
  estimatedNote: "एक्सपोज़र पास के मॉनिटर के पिछले 24 घंटों से अनुमानित है, रास्ते पर मापा नहीं गया।",
  approximate: "अनुमानित: शुरुआत के 25 कि.मी. में कोई रेफ़रेंस मॉनिटर नहीं था, या केवल उप-सूचकांक मिला।",
  basis: {
    "hourly-profile": (s) => `आपके सफ़र के समय के लिए ${s} का पिछले 24 घंटों का पैटर्न इस्तेमाल हुआ।`,
    latest: (s) => `${s} का घंटेवार पैटर्न उपलब्ध नहीं; उसकी ताज़ा रीडिंग इस्तेमाल हुई।`,
    "sub-index": (s) => `${s} के CPCB उप-सूचकांक से अनुमानित।`,
  },
  labels: { cleanest: "सबसे साफ़ हवा", fastest: "सबसे तेज़", balance: "सबसे संतुलित" },
  duration: "अवधि",
  distance: "दूरी",
  pm25: "अनुमानित PM2.5 सांस में",
  co2: "अनुमानित CO₂",
  min: "मिनट",
  km: "कि.मी.",
  ug: "µg",
  kg: "kg",
  tableCaption: "साधन के अनुसार सभी रास्ते (सबसे अच्छा पहले)",
  mode: "साधन",
  route: "रास्ता",
  roads: "सड़क डेटा",
  roadApplied: (pct) => `मुख्य सड़क समायोजन लागू (रास्ते का ${pct}%)`,
  roadNot: "लागू नहीं (OSRM ने सड़क श्रेणी नहीं दी)",
  twoWheelerNote: "दोपहिया के लिए कार का सड़क नेटवर्क और कार का यात्रा समय इस्तेमाल होता है।",
  noneFor: (modes) => `इनके लिए रास्ता नहीं मिला: ${modes}।`,
  computedNote: (reason) => `कारण गणना किए गए आंकड़ों से लिखे गए हैं (${reason})।`,
  attribution: "स्थान और रास्ते © OpenStreetMap योगदानकर्ता (Nominatim, OSRM)।",
};

/** Route planner strings per language. */
export const ROUTE_UI: Record<Language, RouteStrings> = { en, hi };
