import type { Language } from "@/lib/i18n";

export interface ChecklistStrings {
  heading: string;
  intro: string;
  progress: (done: number, total: number) => string;
  why: string;
  impact: string;
  uncheckAll: string;
  storage: string;
  filter: { action: string; why: string; forYou: string };
  groupLabel: string;
}

const en: ChecklistStrings = {
  heading: "Household checklist for today",
  intro: "Tick these off as you go. They are the indoor actions that matter most at today's air quality, and they reset every morning.",
  progress: (done, total) => `${done} of ${total} done`,
  why: "Why",
  impact: "Impact",
  uncheckAll: "Uncheck all",
  storage: "Saved on this device only (no account). Clearing your browser data clears it.",
  filter: {
    action: "Check your purifier's filter indicator and clean or replace the filter if it is due.",
    why: "A clogged filter moves less air, so the purifier removes less PM2.5 than the figure below.",
    forYou: "Your air purifier",
  },
  groupLabel: "Indoor actions",
};

const hi: ChecklistStrings = {
  heading: "आज के लिए घर की चेकलिस्ट",
  intro: "काम होते ही टिक करें। ये आज की हवा में घर के अंदर के सबसे ज़रूरी काम हैं, और हर सुबह रीसेट हो जाते हैं।",
  progress: (done, total) => `${total} में से ${done} पूरे`,
  why: "क्यों",
  impact: "असर",
  uncheckAll: "सभी टिक हटाएँ",
  storage: "सिर्फ़ इस डिवाइस पर सहेजा गया (कोई खाता नहीं)। ब्राउज़र डेटा साफ़ करने पर यह मिट जाएगा।",
  filter: {
    action: "अपने प्यूरीफ़ायर का फ़िल्टर सूचक देखें और ज़रूरत हो तो फ़िल्टर साफ़ करें या बदलें।",
    why: "गंदा फ़िल्टर कम हवा खींचता है, इसलिए प्यूरीफ़ायर नीचे दिए आंकड़े से कम PM2.5 हटाता है।",
    forYou: "आपका एयर प्यूरीफ़ायर",
  },
  groupLabel: "घर के अंदर के काम",
};

export const CHECKLIST_STRINGS: Record<Language, ChecklistStrings> = { en, hi };
