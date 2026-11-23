export const VOTES = ["up", "down"] as const;
export type Vote = (typeof VOTES)[number];
export const FEEDBACK_STORAGE_KEY = "feedback";
