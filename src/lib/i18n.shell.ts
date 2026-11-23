import type { Language } from "./i18n";
import type { SectionId } from "@/components/shell/sections";

export interface ShellStrings {
  brand: string;
  skip: string;
  navLabel: string;
  nav: Record<SectionId, string>;
  titles: Record<SectionId, string>;
  ask: string;
  askTitle: string;
  askClose: string;
  language: string;
  languages: { en: string; hi: string };
  theme: { label: string; hint: string; system: string; light: string; dark: string };
  onboarding: {
    title: string;
    intro: string;
    city: string;
    household: string;
    householdHint: string;
    kids: string;
    elderly: string;
    respiratory: string;
    pets: string;
    submit: string;
    refine: string;
  };
  today: {
    window: string;
    windows: string;
    mask: string;
    windowsValue: Record<"open" | "limited" | "closed", string>;
    maskValue: Record<"none" | "optional" | "n95", string>;
    usually: string;
    retry: string;
    unavailableAction: string;
  };
  plan: { loadingTitle: string; errorTitle: string; retry: string; cardsLabel: string };
  empty: { title: string; body: string; action: string };
  me: { householdNote: string; forgetTitle: string; forgetBody: string; forget: string };
  hero: { history: (hours: number) => string; range: (d: { low: number; lowAt: string; high: number; highAt: string }) => string; details: string };
}

const en: ShellStrings = {
  brand: "SmogSense",
  skip: "Skip to main content",
  navLabel: "Main navigation",
  nav: { today: "Today", plan: "Plan", routes: "Routes", outlook: "Outlook", me: "Me" },
  titles: { today: "Today", plan: "Your plan", routes: "Cleaner routes", outlook: "Outlook", me: "Me" },
  ask: "Ask",
  askTitle: "Ask SmogSense",
  askClose: "Close",
  language: "Language",
  languages: { en: "English", hi: "हिन्दी" },
  theme: { label: "Appearance", hint: "Follows your device unless you choose.", system: "Match device", light: "Light", dark: "Dark" },
  onboarding: {
    title: "Welcome to SmogSense",
    intro: "Tell us where you are and who you're looking after. You'll get the live air quality, what it means for you today, and a plan. Takes ten seconds, and you can add more detail later in Me.",
    city: "Your city",
    household: "Who lives with you?",
    householdHint: "Tick all that apply. This changes the advice, for example for children.",
    kids: "Children",
    elderly: "Elderly family members",
    respiratory: "Someone with asthma or breathing sensitivity",
    pets: "Pets",
    submit: "Show my air",
    refine: "Want better advice? Add your commute and home details in Me.",
  },
  today: {
    window: "Best time outside",
    windows: "Windows",
    mask: "Mask",
    windowsValue: { open: "Can stay open", limited: "Open at the best time", closed: "Keep shut" },
    maskValue: { none: "Not needed", optional: "Optional", n95: "N95 outdoors" },
    usually: "usually",
    retry: "Try again",
    unavailableAction: "Check again",
  },
  plan: { loadingTitle: "Building your plan…", errorTitle: "We couldn't build your plan", retry: "Try again", cardsLabel: "Plan sections" },
  empty: { title: "Start with Today", body: "We need your city and household first. It only takes a moment.", action: "Go to Today" },
  me: { householdNote: "Changing these refreshes your air quality and plan.", forgetTitle: "Forget my household", forgetBody: "Removes the saved city and household from this device. Your trips and settings stay.", forget: "Forget my household" },
  hero: {
    history: (hours) => `PM2.5 over the last ${hours} hours`,
    range: (d) => `Lowest ${d.low} µg/m³ around ${d.lowAt}; highest ${d.high} µg/m³ around ${d.highAt}.`,
    details: "Pollutant details",
  },
};

const hi: ShellStrings = {
  brand: "SmogSense",
  skip: "मुख्य सामग्री पर जाएँ",
  navLabel: "मुख्य नेविगेशन",
  nav: { today: "आज", plan: "योजना", routes: "रास्ते", outlook: "पूर्वानुमान", me: "मैं" },
  titles: { today: "आज", plan: "आपकी योजना", routes: "साफ़ हवा वाले रास्ते", outlook: "पूर्वानुमान", me: "मैं" },
  ask: "पूछें",
  askTitle: "SmogSense से पूछें",
  askClose: "बंद करें",
  language: "भाषा",
  languages: { en: "English", hi: "हिन्दी" },
  theme: { label: "रूप", hint: "जब तक आप न चुनें, डिवाइस की सेटिंग के अनुसार।", system: "डिवाइस के अनुसार", light: "हल्का", dark: "गहरा" },
  onboarding: {
    title: "SmogSense में आपका स्वागत है",
    intro: "बताइए आप कहाँ हैं और किनका ख़याल रखते हैं। आपको लाइव हवा की गुणवत्ता, आज आपके लिए उसका मतलब और एक योजना मिलेगी। दस सेकंड लगते हैं, और बाद में \"मैं\" में और जानकारी जोड़ सकते हैं।",
    city: "आपका शहर",
    household: "आपके साथ कौन रहता है?",
    householdHint: "जो लागू हों सब चुनें। इससे सलाह बदलती है, जैसे बच्चों के लिए।",
    kids: "बच्चे",
    elderly: "बुज़ुर्ग परिजन",
    respiratory: "दमा या साँस की संवेदनशीलता वाला कोई व्यक्ति",
    pets: "पालतू जानवर",
    submit: "मेरी हवा दिखाएँ",
    refine: "बेहतर सलाह चाहिए? \"मैं\" में अपना सफ़र और घर की जानकारी जोड़ें।",
  },
  today: {
    window: "बाहर जाने का सबसे अच्छा समय",
    windows: "खिड़कियाँ",
    mask: "मास्क",
    windowsValue: { open: "खुली रह सकती हैं", limited: "सबसे अच्छे समय पर खोलें", closed: "बंद रखें" },
    maskValue: { none: "ज़रूरी नहीं", optional: "वैकल्पिक", n95: "बाहर N95" },
    usually: "आम तौर पर",
    retry: "फिर कोशिश करें",
    unavailableAction: "फिर जाँचें",
  },
  plan: { loadingTitle: "आपकी योजना बन रही है…", errorTitle: "हम आपकी योजना नहीं बना पाए", retry: "फिर कोशिश करें", cardsLabel: "योजना के हिस्से" },
  empty: { title: "आज से शुरू करें", body: "पहले हमें आपका शहर और परिवार चाहिए। बस एक पल लगता है।", action: "आज पर जाएँ" },
  me: { householdNote: "इन्हें बदलने पर आपकी हवा की गुणवत्ता और योजना ताज़ा हो जाती हैं।", forgetTitle: "मेरा परिवार भूल जाएँ", forgetBody: "इस डिवाइस से सहेजा हुआ शहर और परिवार हटाता है। आपके सफ़र और सेटिंग बनी रहती हैं।", forget: "मेरा परिवार भूल जाएँ" },
  hero: {
    history: (hours) => `पिछले ${hours} घंटों में PM2.5`,
    range: (d) => `सबसे कम ${d.low} µg/m³ लगभग ${d.lowAt} पर; सबसे ज़्यादा ${d.high} µg/m³ लगभग ${d.highAt} पर।`,
    details: "प्रदूषकों का ब्योरा",
  },
};

/** Shell strings per language. */
export const SHELL: Record<Language, ShellStrings> = { en, hi };
