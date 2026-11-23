import type { RephraseTarget } from "@/lib/ai/rephrase";
import type { AQSnapshot } from "@/lib/aq/types";
import { AQI_POOR } from "@/lib/constants";
import type { Language } from "@/lib/i18n";
import { formatWindow, timingFromHistory } from "@/lib/impact/timing";
import type { UserProfile } from "@/lib/profile";
import { maskFor, type MaskLevel } from "../mask/logic";
import { TODAY_STRINGS } from "./strings";

/** Windows are "open" up to the CPCB Satisfactory band; between that and Poor they are opened mainly in the cleanest window. */
const WINDOWS_OPEN_UP_TO_AQI = 100;

export type WindowsState = "open" | "limited" | "closed";

/** The decisions behind the one-line summary, all computed from the live reading and the household. */
export interface TodayFacts {
  window: string;
  /** True when the window comes from the station's measured last 24 h, false for the documented default. */
  measured: boolean;
  windows: WindowsState;
  mask: MaskLevel;
}

/**
 * Best outdoor window, whether windows should stay shut, and whether to wear a mask when going out.
 * @param snapshot - live reading (history gives the measured window; otherwise the documented afternoon default)
 * @param profile - household (sensitive = children, elderly or respiratory sensitivity)
 */
export function todayFacts(snapshot: AQSnapshot, profile: UserProfile): TodayFacts {
  const timing = timingFromHistory(snapshot.history);
  const windows: WindowsState = snapshot.aqi >= AQI_POOR ? "closed" : snapshot.aqi > WINDOWS_OPEN_UP_TO_AQI ? "limited" : "open";
  const mask: MaskLevel = maskFor({ aqi: snapshot.aqi, activity: "commute", sensitive: profile.kids || profile.elderly || profile.respiratory, child: profile.kids }).level;
  return { window: formatWindow(timing.best), measured: timing.measured, windows, mask };
}

/** The one plain sentence, from the computed decisions. This is also the fallback when Gemini is unavailable. */
export function todaySentence(f: TodayFacts, lang: Language): string {
  const t = TODAY_STRINGS[lang];
  return t.sentence({ window: f.measured ? t.bestMeasured(f.window) : t.bestUsual(f.window), windows: t.windows[f.windows](f.window), mask: t.mask[f.mask] });
}

/**
 * What Gemini must preserve when rewording the sentence: both window times, and any "shut windows" or
 * "wear a mask" instruction (so a rewording can never drop a safety decision).
 */
export function todayTarget(f: TodayFacts, lang: Language): RephraseTarget {
  const t = TODAY_STRINGS[lang];
  const mustMention: string[][] = f.window.split("–").map((time) => [time]);
  if (f.windows === "closed") mustMention.push(t.keywords.windowsClosed);
  if (f.mask === "n95") mustMention.push(t.keywords.mask);
  return { line: todaySentence(f, lang), mustMention };
}
