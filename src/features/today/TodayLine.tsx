import type { AQSnapshot } from "@/lib/aq/types";
import type { Language } from "@/lib/i18n";
import type { UserProfile } from "@/lib/profile";
import { todayFacts, todaySentence } from "./logic";
import { TODAY_STRINGS } from "./strings";

export interface TodayLineProps {
  snapshot: AQSnapshot;
  profile: UserProfile;
  language: Language;
  /** Gemini's reworded sentence, if it passed the guard and matches the current language. */
  aiLine?: string;
}

/** One plain sentence at the top of the page: best window, windows open/shut, mask yes/no. */
export default function TodayLine({ snapshot, profile, language, aiLine }: TodayLineProps) {
  const t = TODAY_STRINGS[language];
  return (
    <section aria-labelledby="today-heading" className="rounded-card border-2 border-brand bg-brand-soft p-5">
      <h2 id="today-heading" className="text-sm font-semibold uppercase tracking-wide text-brand-text">{t.heading}</h2>
      <p aria-live="polite" className="mt-1 text-xl font-semibold text-ink">{aiLine ?? todaySentence(todayFacts(snapshot, profile), language)}</p>
      <p className="mt-1 text-xs text-ink-muted">{aiLine ? t.reworded : t.computed}</p>
    </section>
  );
}
