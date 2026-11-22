import type { AqiCategory } from "./aq/types";
import type { CommuteMode } from "./commute";
import { hi } from "./i18n.hi";

/** Supported languages. Kept dependency-free so it can ship in the client bundle. */
export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

/** CPCB category names (Hindi names as used in CPCB's Hindi AQI bulletins). */
export const CATEGORY_LABEL: Record<Language, Record<AqiCategory, string>> = {
  en: { Good: "Good", Satisfactory: "Satisfactory", Moderate: "Moderate", Poor: "Poor", "Very Poor": "Very Poor", Severe: "Severe" },
  hi: { Good: "अच्छा", Satisfactory: "संतोषजनक", Moderate: "मध्यम", Poor: "खराब", "Very Poor": "बहुत खराब", Severe: "गंभीर" },
};

/** CPCB NAQI health statements per category. */
export const HEALTH_IMPACT: Record<Language, Record<AqiCategory, string>> = {
  en: {
    Good: "Minimal impact.",
    Satisfactory: "Minor breathing discomfort to sensitive people.",
    Moderate: "Breathing discomfort to people with lung or heart disease, children and older adults.",
    Poor: "Breathing discomfort to most people on prolonged exposure.",
    "Very Poor": "Respiratory illness on prolonged exposure.",
    Severe: "Affects healthy people and seriously impacts those with existing diseases.",
  },
  hi: {
    Good: "न्यूनतम प्रभाव।",
    Satisfactory: "संवेदनशील लोगों को सांस लेने में हल्की तकलीफ।",
    Moderate: "फेफड़े या हृदय रोग वाले लोगों, बच्चों और बुज़ुर्गों को सांस लेने में तकलीफ।",
    Poor: "लंबे समय तक संपर्क में रहने पर ज़्यादातर लोगों को सांस लेने में तकलीफ।",
    "Very Poor": "लंबे समय तक संपर्क में रहने पर सांस की बीमारी।",
    Severe: "स्वस्थ लोगों पर भी असर, पहले से बीमार लोगों पर गंभीर प्रभाव।",
  },
};

export const MODE_NAME: Record<Language, Record<CommuteMode, string>> = {
  en: { walk: "walking", cycle: "cycling", metro: "metro", bus: "bus", two_wheeler: "two-wheeler", auto: "auto-rickshaw", car: "car" },
  hi: { walk: "पैदल", cycle: "साइकिल", metro: "मेट्रो", bus: "बस", two_wheeler: "दोपहिया", auto: "ऑटो-रिक्शा", car: "कार" },
};

const en = {
  form: {
    heading: "Your household",
    location: "Location",
    city: "City",
    useLocation: "Use my current location",
    locating: "Finding your location…",
    geoUnsupported: "Location is not supported by this browser. Please pick a city.",
    geoFailed: "Couldn't get your location. Please pick a city instead.",
    geoUsing: (city: string) => `Using your current location (nearest listed city: ${city}).`,
    household: "Who lives with you?",
    kids: "Children",
    elderly: "Elderly family members",
    respiratory: "Someone with asthma or other breathing sensitivity",
    pets: "Pets",
    commute: "Daily commute",
    mode: "Usual mode",
    km: "One-way distance (km)",
    kmHint: "Use 0 if you work from home.",
    kmError: (max: number) => `Enter a distance between 0 and ${max} km.`,
    workStart: "Work starts",
    workEnd: "Work ends",
    home: "Home",
    purifier: "I own an air purifier",
    budget: "Budget for air-quality upgrades",
    budgets: { low: "Low", medium: "Medium", high: "High" },
    language: "Language",
    submit: "Get my plan",
    submitting: "Getting your plan…",
  },
  card: {
    heading: "Air quality now",
    idle: "Choose your city and household details, then select “Get my plan”.",
    loading: "Fetching the latest station reading…",
    unavailableTitle: "Live data unavailable",
    unavailableBody: "SmogSense never guesses pollution levels, so no advice is shown. Please try again in a few minutes.",
    meta: (station: string, time: string, source: string) => `${station} · measured ${time} · source ${source}.`,
    method: (dominant: string) => `CPCB National AQI method; main pollutant ${dominant}.`,
    stale: "Heads up: this reading is more than 3 hours old. The station may be delayed.",
    caption: "Pollutant readings",
    pollutant: "Pollutant",
    concentration: "Concentration (µg/m³)",
    subIndex: "Sub-index",
  },
  plan: {
    heading: "Your plan",
    byGemini: "Personalised by Gemini from the live reading. Impact numbers are calculated by SmogSense, not the AI.",
    byRules: "Rule-based plan (AI unavailable). Impact numbers are calculated from published research factors.",
    bestTime: "Best time to be outdoors: ",
    tabsLabel: "Plan sections",
    tabs: { routines: "Daily routines", indoor: "Indoor air", alternatives: "Greener choices" },
    empty: "No recommendations in this section for your profile.",
    why: "Why",
    impact: "Impact",
    forYou: "For you",
    priority: { high: "High priority", medium: "Medium priority", low: "Nice to have" },
    building: "Building your personalised plan…",
  },
  chat: {
    heading: "Ask a follow-up",
    log: "Conversation",
    you: "You said: ",
    bot: "SmogSense: ",
    thinking: "Thinking…",
    label: "Your question",
    placeholder: "e.g. Is it safe to take my kids to the park this evening?",
    count: (n: number, max: number) => `${n}/${max} characters`,
    ask: "Ask",
    answering: "Answering…",
    loading: "Loading chat…",
  },
  errors: {
    AQ_UNAVAILABLE: "Live air-quality data is unavailable for this location right now.",
    AI_UNAVAILABLE: "The AI assistant is unavailable right now. The rule-based plan above still applies.",
    RATE_LIMITED: "Too many requests. Please wait a minute and try again.",
    BAD_REQUEST: "Some details look invalid. Please check the form.",
    NETWORK: "Couldn't reach SmogSense. Check your connection and try again.",
  },
};

export type UiStrings = typeof en;

/** UI strings per language. */
export const UI: Record<Language, UiStrings> = { en, hi };

/**
 * Localised message for an API error code, falling back to the server's (English) message.
 * @param lang - UI language
 * @param code - API error code, or undefined for network failures
 * @param fallback - server-provided message
 */
export function errorMessage(lang: Language, code?: string, fallback?: string): string {
  const errors: Record<string, string> = UI[lang].errors;
  return (code && errors[code]) || fallback || UI[lang].errors.NETWORK;
}
