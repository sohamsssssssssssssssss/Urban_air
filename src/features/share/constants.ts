export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const CARD_FONT_FAMILY = "Noto Sans Devanagari";
export const CARD_PERIODS = ["week", "month", "all"] as const;
export type CardPeriod = (typeof CARD_PERIODS)[number];
/** The "today" card changes only when the reading does (about hourly), so it is cached for 10 minutes. */
export const TODAY_CARD_CACHE_S = 600;
export const WEEKLY_CARD_CACHE_S = 300;
/** Sanity bounds for the self-reported weekly card (a person cannot log more than this on one device). */
export const WEEKLY_BOUNDS = { trips: 1000, km: 100_000, co2: 10_000, pm25: 1_000_000 } as const;
/** CPCB category colours, used only as an accent: the category is always also written as text. */
export const CATEGORY_ACCENT = { Good: "#22c55e", Satisfactory: "#84cc16", Moderate: "#eab308", Poor: "#f97316", "Very Poor": "#ef4444", Severe: "#be123c" } as const;
