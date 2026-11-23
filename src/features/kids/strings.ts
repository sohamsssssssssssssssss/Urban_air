import type { Language } from "@/lib/i18n";

export interface KidsStrings {
  label: string;
  hint: string;
  active: string;
  updating: string;
}

const en: KidsStrings = {
  label: "Kid-friendly wording",
  hint: "Simpler words for the routine and indoor tips. The numbers stay exactly the same.",
  active: "Showing kid-friendly wording. Gemini rewrites it when available; otherwise ready-made kid templates are used.",
  updating: "Updating your plan…",
};

const hi: KidsStrings = {
  label: "बच्चों के लिए आसान शब्द",
  hint: "रोज़ की आदतों और घर के अंदर के सुझावों के लिए आसान शब्द। आंकड़े बिल्कुल वही रहते हैं।",
  active: "बच्चों के लिए आसान शब्द दिखाए जा रहे हैं। Gemini उपलब्ध हो तो वही लिखता है; नहीं तो तैयार बच्चों वाले टेम्पलेट इस्तेमाल होते हैं।",
  updating: "आपकी योजना अपडेट हो रही है…",
};

export const KIDS_STRINGS: Record<Language, KidsStrings> = { en, hi };
