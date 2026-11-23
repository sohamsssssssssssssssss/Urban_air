import type { MaskLevel } from "../mask/logic";
import type { Language } from "@/lib/i18n";

export interface TodayStrings {
  heading: string;
  bestMeasured: (window: string) => string;
  bestUsual: (window: string) => string;
  windows: Record<"open" | "limited" | "closed", (window: string) => string>;
  mask: Record<MaskLevel, string>;
  sentence: (d: { window: string; windows: string; mask: string }) => string;
  /** Any-of keyword groups used to check a reworded sentence keeps the decision (both languages are accepted). */
  keywords: { windowsClosed: string[]; mask: string[] };
  reworded: string;
  computed: string;
}

const en: TodayStrings = {
  heading: "Today in one line",
  bestMeasured: (w) => `Today the best time outside is ${w}.`,
  bestUsual: (w) => `Outside is usually best ${w} (no hourly data at this station).`,
  windows: {
    open: () => "Windows can stay open.",
    limited: (w) => `Open windows mainly during ${w}.`,
    closed: (w) => `Keep windows shut and air out for only 10–15 minutes during ${w}.`,
  },
  mask: { none: "No mask needed.", optional: "A mask is optional; choose an N95 if you are sensitive.", n95: "Wear a close-fitted N95 when you go out." },
  sentence: (d) => `${d.window} ${d.windows} ${d.mask}`,
  keywords: { windowsClosed: ["shut", "closed", "close", "बंद"], mask: ["mask", "N95", "मास्क"] },
  reworded: "Reworded by Gemini. The times and decisions come from the live data.",
  computed: "Written from the live data.",
};

const hi: TodayStrings = {
  heading: "आज एक पंक्ति में",
  bestMeasured: (w) => `आज बाहर जाने का सबसे अच्छा समय ${w} है।`,
  bestUsual: (w) => `बाहर आम तौर पर ${w} सबसे अच्छा रहता है (इस स्टेशन का घंटेवार डेटा नहीं)।`,
  windows: {
    open: () => "खिड़कियाँ खुली रह सकती हैं।",
    limited: (w) => `खिड़कियाँ मुख्य रूप से ${w} में खोलें।`,
    closed: (w) => `खिड़कियाँ बंद रखें और ${w} में सिर्फ़ 10–15 मिनट हवा आने दें।`,
  },
  mask: { none: "मास्क की ज़रूरत नहीं।", optional: "मास्क वैकल्पिक है; संवेदनशील हों तो N95 चुनें।", n95: "बाहर जाते समय अच्छी तरह फिट N95 मास्क पहनें।" },
  sentence: (d) => `${d.window} ${d.windows} ${d.mask}`,
  keywords: en.keywords,
  reworded: "Gemini ने शब्द बदले हैं। समय और फ़ैसले लाइव डेटा से आते हैं।",
  computed: "लाइव डेटा से लिखा गया।",
};

export const TODAY_STRINGS: Record<Language, TodayStrings> = { en, hi };
