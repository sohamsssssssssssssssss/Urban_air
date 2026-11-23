import type { Language } from "@/lib/i18n";
import type { MaskActivity, MaskLevel } from "./logic";

export interface MaskStrings {
  heading: string;
  intro: (aqi: number, category: string) => string;
  activity: Record<MaskActivity, string>;
  level: Record<MaskLevel, string>;
  avoidExertion: string;
  childNote: string;
  fitHeading: string;
  fitTips: string[];
  notEffective: string;
  disclaimer: string;
  sourceLead: string;
  bandsCaption: string;
  colBand: string;
  colCommute: string;
  colSensitive: string;
  colExercise: string;
  colActivity: string;
  colAdvice: string;
}

const en: MaskStrings = {
  heading: "Mask guide",
  intro: (aqi, category) => `At AQI ${aqi} (${category}), here is what to wear for your household.`,
  activity: { indoors: "Staying indoors", commute: "Commuting or errands outside", exertion: "Exercise or play outside" },
  level: { none: "No mask needed", optional: "Optional: an N95/FFP2 if you are sensitive", n95: "Close-fitted N95/FFP2 (or N99)" },
  avoidExertion: "Avoid or keep outdoor exertion short.",
  childNote: "N95/FFP2 respirators are made for adults, and NIOSH has not approved any for children. For young children, limit time outdoors on poor-air days instead of using an adult mask, and ask a paediatrician about older children.",
  fitHeading: "Getting a good fit",
  fitTips: [
    "Look for N95, FFP2 or N99 on the pack; a loose mask filters far less.",
    "Cover nose, mouth and chin, and pinch the metal strip over the nose.",
    "Do a seal check: cover the mask with both hands and breathe in and out; if air leaks at the edges, adjust.",
    "Beard or stubble under the edge lets air leak; a clean-shaven seal fits best (NIOSH).",
    "Masks help when time outside is short. Replace one that is damp, dirty or hard to breathe through.",
  ],
  notEffective: "Paper masks, handkerchiefs, scarves and cloth masks are not effective against fine particles (MoHFW).",
  disclaimer: "General information, not medical advice. If you have a heart or lung condition or feel unwell, talk to a doctor.",
  sourceLead: "Sources:",
  bandsCaption: "Mask advice by AQI band",
  colBand: "AQI band",
  colCommute: "Commute",
  colSensitive: "Commute, sensitive person",
  colExercise: "Outdoor exercise",
  colActivity: "Activity",
  colAdvice: "Advice",
};

const hi: MaskStrings = {
  heading: "मास्क गाइड",
  intro: (aqi, category) => `AQI ${aqi} (${category}) पर आपके परिवार को यह पहनना चाहिए।`,
  activity: { indoors: "घर के अंदर रहना", commute: "बाहर सफ़र या काम", exertion: "बाहर व्यायाम या खेल" },
  level: { none: "मास्क की ज़रूरत नहीं", optional: "वैकल्पिक: संवेदनशील हों तो N95/FFP2", n95: "अच्छी तरह फिट N95/FFP2 (या N99)" },
  avoidExertion: "बाहर की मेहनत से बचें या कम रखें।",
  childNote: "N95/FFP2 रेस्पिरेटर वयस्कों के लिए बने हैं और NIOSH ने बच्चों के लिए कोई भी मंज़ूर नहीं किया है। छोटे बच्चों के लिए वयस्क मास्क की जगह खराब हवा वाले दिनों में बाहर का समय कम रखें; बड़े बच्चों के बारे में बाल रोग विशेषज्ञ से पूछें।",
  fitHeading: "सही फिट कैसे पाएँ",
  fitTips: [
    "पैक पर N95, FFP2 या N99 देखें; ढीला मास्क बहुत कम छानता है।",
    "नाक, मुँह और ठोड़ी ढकें और नाक पर धातु की पट्टी दबाएँ।",
    "सील जाँच करें: दोनों हाथों से मास्क ढकें और साँस अंदर-बाहर करें; किनारों से हवा निकले तो ठीक करें।",
    "किनारे के नीचे दाढ़ी या खूँटी से हवा लीक होती है; साफ़ शेव पर फिट सबसे अच्छा बैठता है (NIOSH)।",
    "बाहर का समय कम हो तो मास्क मदद करता है। गीला, गंदा या साँस लेने में भारी मास्क बदल दें।",
  ],
  notEffective: "कागज़ के मास्क, रूमाल, स्कार्फ़ और कपड़े के मास्क महीन कणों के खिलाफ़ प्रभावी नहीं हैं (MoHFW)।",
  disclaimer: "यह सामान्य जानकारी है, चिकित्सकीय सलाह नहीं। हृदय या फेफड़ों की बीमारी हो या तबीयत ठीक न लगे तो डॉक्टर से बात करें।",
  sourceLead: "स्रोत:",
  bandsCaption: "AQI श्रेणी के अनुसार मास्क सलाह",
  colBand: "AQI श्रेणी",
  colCommute: "सफ़र",
  colSensitive: "सफ़र, संवेदनशील व्यक्ति",
  colExercise: "बाहर व्यायाम",
  colActivity: "गतिविधि",
  colAdvice: "सलाह",
};

export const MASK_STRINGS: Record<Language, MaskStrings> = { en, hi };
