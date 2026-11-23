import type { Language } from "@/lib/i18n";
import type { SideError } from "./server";

export interface CompareStrings {
  heading: string;
  intro: string;
  placeLabel: (n: 1 | 2) => string;
  other: string;
  otherLabel: (n: 1 | 2) => string;
  otherHint: string;
  submit: string;
  submitting: string;
  aqi: string;
  dominant: string;
  station: string;
  bestWindow: string;
  windowUsual: string;
  stale: string;
  sideError: Record<SideError, string>;
  similar: (d: { a: string; b: string; aqiA: number; aqiB: number }) => string;
  cleaner: (d: { clean: string; dirty: string; aqiClean: number; aqiDirty: number; diff: number }) => string;
  storage: string;
}

const en: CompareStrings = {
  heading: "Compare two places",
  intro: "See live air quality side by side, for example where you live and where you work.",
  placeLabel: (n) => `Place ${n}`,
  other: "Another place…",
  otherLabel: (n) => `Name of place ${n}`,
  otherHint: "A locality, landmark or address in India.",
  submit: "Compare",
  submitting: "Comparing…",
  aqi: "AQI",
  dominant: "Main pollutant",
  station: "Station",
  bestWindow: "Best time outside",
  windowUsual: "usually",
  stale: "This reading is more than 3 hours old.",
  sideError: {
    AQ_UNAVAILABLE: "Live air-quality data is unavailable for this place right now.",
    PLACE_NOT_FOUND: "We couldn't find that place. Try a more specific name or add the city.",
    GEOCODE_UNAVAILABLE: "Place search is unavailable right now. Please try again shortly.",
  },
  similar: (d) => `Air quality is similar in both places: AQI ${d.aqiA} in ${d.a} and ${d.aqiB} in ${d.b}.`,
  cleaner: (d) => `${d.clean} has cleaner air right now: AQI ${d.aqiClean} against ${d.aqiDirty} in ${d.dirty} (${d.diff} points lower).`,
  storage: "Your last two choices are remembered on this device only.",
};

const hi: CompareStrings = {
  heading: "दो जगहों की तुलना",
  intro: "लाइव वायु गुणवत्ता साथ-साथ देखें, जैसे जहाँ आप रहते हैं और जहाँ काम करते हैं।",
  placeLabel: (n) => `जगह ${n}`,
  other: "कोई और जगह…",
  otherLabel: (n) => `जगह ${n} का नाम`,
  otherHint: "भारत में कोई इलाका, लैंडमार्क या पता।",
  submit: "तुलना करें",
  submitting: "तुलना हो रही है…",
  aqi: "AQI",
  dominant: "मुख्य प्रदूषक",
  station: "स्टेशन",
  bestWindow: "बाहर जाने का सबसे अच्छा समय",
  windowUsual: "आम तौर पर",
  stale: "यह रीडिंग 3 घंटे से ज़्यादा पुरानी है।",
  sideError: {
    AQ_UNAVAILABLE: "इस जगह के लिए अभी लाइव वायु गुणवत्ता डेटा उपलब्ध नहीं है।",
    PLACE_NOT_FOUND: "वह जगह नहीं मिली। ज़्यादा सटीक नाम लिखें या शहर जोड़ें।",
    GEOCODE_UNAVAILABLE: "जगह खोज अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद कोशिश करें।",
  },
  similar: (d) => `दोनों जगहों पर हवा की गुणवत्ता एक जैसी है: ${d.a} में AQI ${d.aqiA} और ${d.b} में ${d.aqiB}।`,
  cleaner: (d) => `${d.clean} में अभी हवा साफ़ है: AQI ${d.aqiClean}, जबकि ${d.dirty} में ${d.aqiDirty} (${d.diff} अंक कम)।`,
  storage: "आपके पिछले दो विकल्प सिर्फ़ इस डिवाइस पर याद रखे जाते हैं।",
};

export const COMPARE_STRINGS: Record<Language, CompareStrings> = { en, hi };
