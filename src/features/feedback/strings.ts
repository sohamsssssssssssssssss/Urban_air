import type { Language } from "@/lib/i18n";

export interface FeedbackStrings {
  group: string;
  helpful: string;
  notUseful: string;
  thanks: string;
}

const en: FeedbackStrings = {
  group: "Was this tip useful?",
  helpful: "Helpful",
  notUseful: "Not useful",
  thanks: "Thanks. Only the tip and your vote were sent: no name, location or profile.",
};

const hi: FeedbackStrings = {
  group: "क्या यह सुझाव काम का था?",
  helpful: "काम का",
  notUseful: "काम का नहीं",
  thanks: "धन्यवाद। सिर्फ़ सुझाव और आपका वोट भेजा गया: कोई नाम, लोकेशन या प्रोफ़ाइल नहीं।",
};

export const FEEDBACK_STRINGS: Record<Language, FeedbackStrings> = { en, hi };
