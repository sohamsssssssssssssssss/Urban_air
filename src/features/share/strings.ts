import type { Language } from "@/lib/i18n";
import type { MaskLevel } from "../mask/logic";
import type { CardPeriod } from "./constants";

/** Text drawn on the image. The font has no µ, ³ or ₂, so units are spelled out. */
export interface CardStrings {
  brand: string;
  aqi: string;
  bestTime: (window: string, measured: boolean) => string;
  mask: Record<MaskLevel, string>;
  source: (station: string, time: string, source: string) => string;
  weeklyTitle: Record<CardPeriod, string>;
  co2Avoided: (kg: string) => string;
  co2Extra: (kg: string) => string;
  pmAvoided: (ug: string) => string;
  pmExtra: (ug: string) => string;
  tripsKm: (trips: number, km: string) => string;
  selfReported: string;
}

const en: CardStrings = {
  brand: "SmogSense",
  aqi: "AQI",
  bestTime: (w, measured) => (measured ? `Best time outside: ${w}` : `Usually best outside: ${w}`),
  mask: { none: "No mask needed", optional: "Mask optional", n95: "Wear a close-fitted N95 outdoors" },
  source: (station, time, source) => `${station} · ${time} · ${source}`,
  weeklyTitle: { week: "My week with SmogSense", month: "My month with SmogSense", all: "My impact with SmogSense" },
  co2Avoided: (kg) => `${kg} kg CO2 avoided`,
  co2Extra: (kg) => `${kg} kg CO2 extra`,
  pmAvoided: (ug) => `${ug} micrograms of PM2.5 breathed in less (estimate)`,
  pmExtra: (ug) => `${ug} micrograms of PM2.5 breathed in more (estimate)`,
  tripsKm: (trips, km) => `${trips} ${trips === 1 ? "trip" : "trips"} · ${km} km`,
  selfReported: "Self-reported on this device. Estimates only.",
};

const hi: CardStrings = {
  brand: "SmogSense",
  aqi: "AQI",
  bestTime: (w, measured) => (measured ? `बाहर जाने का सबसे अच्छा समय: ${w}` : `बाहर आम तौर पर सबसे अच्छा: ${w}`),
  mask: { none: "मास्क की ज़रूरत नहीं", optional: "मास्क वैकल्पिक", n95: "बाहर फिट N95 मास्क पहनें" },
  source: (station, time, source) => `${station} · ${time} · ${source}`,
  weeklyTitle: { week: "SmogSense के साथ मेरा हफ़्ता", month: "SmogSense के साथ मेरा महीना", all: "SmogSense के साथ मेरा असर" },
  co2Avoided: (kg) => `${kg} kg CO2 बची`,
  co2Extra: (kg) => `${kg} kg CO2 ज़्यादा`,
  pmAvoided: (ug) => `${ug} माइक्रोग्राम PM2.5 कम सांस में गई (अनुमान)`,
  pmExtra: (ug) => `${ug} माइक्रोग्राम PM2.5 ज़्यादा सांस में गई (अनुमान)`,
  tripsKm: (trips, km) => `${trips} सफ़र · ${km} कि.मी.`,
  selfReported: "इसी डिवाइस पर खुद दर्ज किया गया। केवल अनुमान।",
};

export const CARD_STRINGS: Record<Language, CardStrings> = { en, hi };

export interface ShareStrings {
  heading: string;
  intro: string;
  kind: string;
  kinds: { today: string; weekly: string };
  city: string;
  period: string;
  periods: Record<CardPeriod, string>;
  noTrips: string;
  preview: string;
  altToday: (city: string) => string;
  altWeekly: (co2: string, trips: number) => string;
  share: string;
  download: string;
  preparing: string;
  shared: string;
  shareFailed: string;
  imageFailed: string;
  privacyShown: string;
  privacyNever: string;
  fallbackNote: string;
}

const shareEn: ShareStrings = {
  heading: "Share a card",
  intro: "Make an image to share: today's air for a city, or your own commute impact.",
  kind: "Card",
  kinds: { today: "Today's air", weekly: "My impact" },
  city: "City",
  period: "Period",
  periods: { week: "This week", month: "This month", all: "All time" },
  noTrips: "Log a trip in the commute tracker first, then your impact card will appear here.",
  preview: "Preview",
  altToday: (city) => `Share card for ${city}: today's AQI and category, the best time to be outside, and whether to wear a mask.`,
  altWeekly: (co2, trips) => `Share card with your commute impact: ${co2} of CO2 avoided over ${trips} ${trips === 1 ? "trip" : "trips"}, with an estimate of PM2.5 breathed in.`,
  share: "Share image",
  download: "Download image",
  preparing: "Preparing the image…",
  shared: "Shared.",
  shareFailed: "Couldn't share it from here. Use Download image instead.",
  imageFailed: "The card couldn't be created right now. Please try again shortly.",
  privacyShown: "On the card: the city, the AQI and advice computed from live data, or your own trip totals.",
  privacyNever: "Never on the card: your name, exact location, household details or trip list.",
  fallbackNote: "Where your browser can't share images directly, use Download image and attach it yourself.",
};

const shareHi: ShareStrings = {
  heading: "कार्ड शेयर करें",
  intro: "शेयर करने के लिए तस्वीर बनाएँ: किसी शहर की आज की हवा, या आपके सफ़र का असर।",
  kind: "कार्ड",
  kinds: { today: "आज की हवा", weekly: "मेरा असर" },
  city: "शहर",
  period: "अवधि",
  periods: { week: "इस हफ़्ते", month: "इस महीने", all: "अब तक" },
  noTrips: "पहले सफ़र ट्रैकर में एक सफ़र दर्ज करें, फिर आपका असर कार्ड यहाँ दिखेगा।",
  preview: "पूर्वावलोकन",
  altToday: (city) => `${city} का शेयर कार्ड: आज का AQI और श्रेणी, बाहर जाने का सबसे अच्छा समय, और मास्क पहनना है या नहीं।`,
  altWeekly: (co2, trips) => `आपके सफ़र के असर का शेयर कार्ड: ${trips} सफ़र में ${co2} CO2 बची, और सांस में गई PM2.5 का अनुमान।`,
  share: "तस्वीर शेयर करें",
  download: "तस्वीर डाउनलोड करें",
  preparing: "तस्वीर तैयार हो रही है…",
  shared: "शेयर हो गया।",
  shareFailed: "यहाँ से शेयर नहीं हो पाया। तस्वीर डाउनलोड करें।",
  imageFailed: "अभी कार्ड नहीं बन पाया। कृपया थोड़ी देर बाद कोशिश करें।",
  privacyShown: "कार्ड पर: शहर, लाइव डेटा से निकला AQI और सलाह, या आपके अपने सफ़र के कुल आंकड़े।",
  privacyNever: "कार्ड पर कभी नहीं: आपका नाम, सटीक लोकेशन, घर की जानकारी या सफ़रों की सूची।",
  fallbackNote: "जहाँ ब्राउज़र सीधे तस्वीर शेयर नहीं कर सकता, वहाँ तस्वीर डाउनलोड करके खुद भेजें।",
};

export const SHARE_STRINGS: Record<Language, ShareStrings> = { en: shareEn, hi: shareHi };
