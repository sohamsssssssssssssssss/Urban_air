import { z } from "../shared/zod";
import type { Fact } from "@/lib/ai/schema";
import type { AQSnapshot } from "@/lib/aq/types";
import { AQI_POOR } from "@/lib/constants";
import type { Language } from "@/lib/i18n";
import { buildFacts } from "@/lib/impact/facts";
import type { UserProfile } from "@/lib/profile";
import { PRIORITIES } from "@/lib/ai/schema";
import { istDayKey } from "../shared/storage";
import { CHECKLIST_STRINGS } from "./strings";

export const CHECKLIST_STORAGE_KEY = "checklist";
const MAX_ITEMS = 20;

/** What is saved per device: which items were ticked, and for which day. */
export const ChecklistStateSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checked: z.array(z.string().max(40)).max(MAX_ITEMS),
});
export type ChecklistState = z.infer<typeof ChecklistStateSchema>;

export interface ChecklistItem {
  id: string;
  action: string;
  why: string;
  impact: string;
  priority: Fact["priority"];
}

/** Indoor facts that are actions (the plants fact is advice to NOT rely on something, so it is not a task). */
const INDOOR_ACTION_IDS = ["ventilation_timing", "purifier", "cooking_exhaust", "no_indoor_smoke"] as const;

/**
 * Today's indoor actions, taken from the computed facts so every item keeps its Why and its computed Impact.
 * - Incense, coils and dhoop are listed only when AQI is above 200 (Poor or worse).
 * - A purifier owner also gets a filter check, reusing the purifier's computed effect as its impact.
 * Sorted high priority first.
 */
export function buildChecklist(snapshot: AQSnapshot, profile: UserProfile, lang: Language): ChecklistItem[] {
  const facts = buildFacts(snapshot, profile, false, lang).filter((f) => (INDOOR_ACTION_IDS as readonly string[]).includes(f.id));
  const items: ChecklistItem[] = facts
    .filter((f) => f.id !== "no_indoor_smoke" || snapshot.aqi >= AQI_POOR)
    .map(({ id, action, why, impact, priority }) => ({ id, action, why, impact, priority }));
  const purifier = facts.find((f) => f.id === "purifier");
  if (profile.ownsPurifier && purifier) {
    const t = CHECKLIST_STRINGS[lang].filter;
    items.push({ id: "filter_check", action: t.action, why: t.why, impact: purifier.impact, priority: "medium" });
  }
  return items.sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
}

/** Saved ticks for today only: a different day, or items that no longer apply, are dropped. */
export function tickedToday(state: ChecklistState, items: ChecklistItem[], now = Date.now()): string[] {
  if (state.day !== istDayKey(now)) return [];
  const valid = new Set(items.map((i) => i.id));
  return state.checked.filter((id) => valid.has(id));
}

/** Toggles one item, stamping today's date so tomorrow starts clean. */
export function toggleItem(state: ChecklistState, items: ChecklistItem[], id: string, now = Date.now()): ChecklistState {
  const current = tickedToday(state, items, now);
  const checked = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
  return { day: istDayKey(now), checked };
}
