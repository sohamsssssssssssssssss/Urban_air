import type { Language } from "@/lib/i18n";

export interface OutlookStrings {
  heading: string;
  badge: string;
  intro: string;
  windowsHeading: string;
  windowLine: (d: { when: string; avg: number; category: string }) => string;
  noWindows: string;
  estimateNote: string;
  chartTitle: string;
  chartDesc: (d: { peakWhen: string; peak: number; lowWhen: string; low: number }) => string;
  windowMarker: (rank: number) => string;
  yAxis: string;
  showTable: string;
  colTime: string;
  colPm25: string;
  colPm10: string;
  loading: string;
  retry: string;
  attribution: string;
}

const en: OutlookStrings = {
  heading: "Next 48 hours",
  badge: "Model forecast (CAMS), not a measurement",
  intro: "A computer-model forecast for your area. It can differ from the station readings above, so use it to plan, not to replace the live AQI.",
  windowsHeading: "Cleanest 3 windows (waking hours)",
  windowLine: (d) => `${d.when}: about ${d.avg} µg/m³ PM2.5 (${d.category} by PM2.5 alone)`,
  noWindows: "No complete waking-hour windows were found in this forecast.",
  estimateNote: "Categories apply the CPCB PM2.5 breakpoints to the forecast and ignore other pollutants, so they are not an official AQI.",
  chartTitle: "Forecast PM2.5 for the next 48 hours",
  chartDesc: (d) => `Highest around ${d.peakWhen} at ${d.peak} µg/m³; lowest around ${d.lowWhen} at ${d.low} µg/m³. The three cleanest windows are numbered 1 to 3.`,
  windowMarker: (rank) => `Window ${rank}`,
  yAxis: "µg/m³",
  showTable: "Show hourly values",
  colTime: "Time",
  colPm25: "PM2.5 (µg/m³)",
  colPm10: "PM10 (µg/m³)",
  loading: "Loading the forecast…",
  retry: "Try again",
  attribution: "Forecast data: Open-Meteo, from the Copernicus Atmosphere Monitoring Service (CAMS) model.",
};

const hi: OutlookStrings = {
  heading: "अगले 48 घंटे",
  badge: "मॉडल पूर्वानुमान (CAMS), माप नहीं",
  intro: "आपके इलाके के लिए कंप्यूटर मॉडल का पूर्वानुमान। यह ऊपर के स्टेशन रीडिंग से अलग हो सकता है, इसलिए योजना बनाने में इस्तेमाल करें, लाइव AQI की जगह नहीं।",
  windowsHeading: "सबसे साफ़ 3 समय-खिड़कियाँ (जागने के घंटे)",
  windowLine: (d) => `${d.when}: लगभग ${d.avg} µg/m³ PM2.5 (केवल PM2.5 के हिसाब से ${d.category})`,
  noWindows: "इस पूर्वानुमान में जागने के घंटों की कोई पूरी खिड़की नहीं मिली।",
  estimateNote: "श्रेणियाँ पूर्वानुमान पर CPCB के PM2.5 ब्रेकपॉइंट लगाकर बनी हैं और अन्य प्रदूषकों को नहीं गिनतीं, इसलिए यह आधिकारिक AQI नहीं है।",
  chartTitle: "अगले 48 घंटों का PM2.5 पूर्वानुमान",
  chartDesc: (d) => `सबसे ज़्यादा ${d.peakWhen} के आसपास ${d.peak} µg/m³; सबसे कम ${d.lowWhen} के आसपास ${d.low} µg/m³। तीन सबसे साफ़ खिड़कियाँ 1 से 3 तक गिनी गई हैं।`,
  windowMarker: (rank) => `खिड़की ${rank}`,
  yAxis: "µg/m³",
  showTable: "घंटेवार मान दिखाएँ",
  colTime: "समय",
  colPm25: "PM2.5 (µg/m³)",
  colPm10: "PM10 (µg/m³)",
  loading: "पूर्वानुमान लोड हो रहा है…",
  retry: "फिर कोशिश करें",
  attribution: "पूर्वानुमान डेटा: Open-Meteo, कॉपरनिकस एटमॉस्फियर मॉनिटरिंग सर्विस (CAMS) मॉडल से।",
};

export const OUTLOOK_STRINGS: Record<Language, OutlookStrings> = { en, hi };
