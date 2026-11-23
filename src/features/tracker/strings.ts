import type { Language } from "@/lib/i18n";

export interface TrackerStrings {
  heading: string;
  intro: string;
  baseline: string;
  baselineHint: string;
  addHeading: string;
  date: string;
  mode: string;
  km: string;
  submit: string;
  prefilled: string;
  logged: string;
  errors: { invalid: string; future: string };
  estimatedNote: string;
  periods: Record<"week" | "month" | "all", string>;
  trips: (n: number) => string;
  distance: (km: number) => string;
  co2Avoided: (kg: number) => string;
  co2Extra: (kg: number) => string;
  pmAvoided: (ug: number) => string;
  pmExtra: (ug: number) => string;
  pmUnknown: string;
  recent: string;
  empty: string;
  remove: (label: string) => string;
  exportCsv: string;
  clear: string;
  confirmClear: (n: number) => string;
  confirmYes: string;
  cancel: string;
  storage: string;
  tripLine: (d: { date: string; mode: string; km: number; source: string }) => string;
  sourceRoute: string;
  sourceManual: string;
}

const en: TrackerStrings = {
  heading: "Commute impact tracker",
  intro: "Log your trips to see, week by week, the CO₂ and PM2.5 you avoid compared with your usual way of travelling.",
  baseline: "Your usual mode (baseline)",
  baselineHint: "Savings are measured against this.",
  addHeading: "Log a trip",
  date: "Date",
  mode: "Mode",
  km: "Distance (km)",
  submit: "Log trip",
  prefilled: "Prefilled from the route you chose. Check the date and log it.",
  logged: "Trip logged.",
  errors: { invalid: "Check the distance (0.1 to 100 km) and date.", future: "The date can't be in the future." },
  estimatedNote: "Estimates only: CO₂ uses average emission factors, and PM2.5 uses a model of what you breathe in on each mode.",
  periods: { week: "This week", month: "This month", all: "All time" },
  trips: (n) => (n === 1 ? "1 trip" : `${n} trips`),
  distance: (km) => `${km} km`,
  co2Avoided: (kg) => `${kg} kg CO₂ avoided`,
  co2Extra: (kg) => `${kg} kg CO₂ extra`,
  pmAvoided: (ug) => `${ug} µg PM2.5 inhaled less (est.)`,
  pmExtra: (ug) => `${ug} µg PM2.5 inhaled more (est.)`,
  pmUnknown: "PM2.5 not estimated (air level unknown)",
  recent: "Recent trips",
  empty: "No trips yet. Log your first trip above.",
  remove: (label) => `Remove ${label}`,
  exportCsv: "Export CSV",
  clear: "Clear all data",
  confirmClear: (n) => `Delete all ${n} trips from this device? This cannot be undone.`,
  confirmYes: "Yes, delete",
  cancel: "Cancel",
  storage: "Saved on this device only (no account). Clearing your browser data clears it; export a CSV to keep a copy.",
  tripLine: (d) => `${d.date} · ${d.mode} · ${d.km} km · ${d.source}`,
  sourceRoute: "from planner",
  sourceManual: "manual",
};

const hi: TrackerStrings = {
  heading: "सफ़र का असर ट्रैकर",
  intro: "अपने सफ़र दर्ज करें और हफ़्ते-दर-हफ़्ते देखें कि आपके आम साधन की तुलना में आपने कितनी CO₂ और PM2.5 बचाई।",
  baseline: "आपका आम साधन (आधार)",
  baselineHint: "बचत इसी से नापी जाती है।",
  addHeading: "सफ़र दर्ज करें",
  date: "तारीख",
  mode: "साधन",
  km: "दूरी (कि.मी.)",
  submit: "सफ़र दर्ज करें",
  prefilled: "चुने हुए रास्ते से भरा गया। तारीख देखें और दर्ज करें।",
  logged: "सफ़र दर्ज हो गया।",
  errors: { invalid: "दूरी (0.1 से 100 कि.मी.) और तारीख जाँचें।", future: "तारीख भविष्य की नहीं हो सकती।" },
  estimatedNote: "केवल अनुमान: CO₂ औसत उत्सर्जन कारकों से और PM2.5 हर साधन पर आप जो साँस लेते हैं उसके मॉडल से निकाला जाता है।",
  periods: { week: "इस हफ़्ते", month: "इस महीने", all: "अब तक" },
  trips: (n) => `${n} सफ़र`,
  distance: (km) => `${km} कि.मी.`,
  co2Avoided: (kg) => `${kg} kg CO₂ बची`,
  co2Extra: (kg) => `${kg} kg CO₂ ज़्यादा`,
  pmAvoided: (ug) => `${ug} µg PM2.5 कम सांस में गई (अनुमान)`,
  pmExtra: (ug) => `${ug} µg PM2.5 ज़्यादा सांस में गई (अनुमान)`,
  pmUnknown: "PM2.5 का अनुमान नहीं (हवा का स्तर अज्ञात)",
  recent: "हाल के सफ़र",
  empty: "अभी कोई सफ़र नहीं। ऊपर अपना पहला सफ़र दर्ज करें।",
  remove: (label) => `${label} हटाएँ`,
  exportCsv: "CSV निर्यात करें",
  clear: "सारा डेटा मिटाएँ",
  confirmClear: (n) => `इस डिवाइस से सभी ${n} सफ़र मिटाएँ? इसे वापस नहीं लाया जा सकता।`,
  confirmYes: "हाँ, मिटाएँ",
  cancel: "रद्द करें",
  storage: "सिर्फ़ इस डिवाइस पर सहेजा गया (कोई खाता नहीं)। ब्राउज़र डेटा साफ़ करने पर मिट जाएगा; कॉपी रखने के लिए CSV निर्यात करें।",
  tripLine: (d) => `${d.date} · ${d.mode} · ${d.km} कि.मी. · ${d.source}`,
  sourceRoute: "प्लानर से",
  sourceManual: "हाथ से",
};

export const TRACKER_STRINGS: Record<Language, TrackerStrings> = { en, hi };
