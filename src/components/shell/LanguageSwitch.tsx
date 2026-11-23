import { SHELL } from "@/lib/i18n.shell";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { cn } from "../ui/cn";

/** English / Hindi switch. A group of two pressed-state buttons, each labelled in its own language. */
export default function LanguageSwitch({ language, onChange }: { language: Language; onChange: (l: Language) => void }) {
  const t = SHELL[language];
  return (
    <div role="group" aria-label={t.language} className="inline-flex rounded-control border border-line-strong p-0.5">
      {LANGUAGES.map((l) => (
        <button
          key={l} type="button" lang={l} aria-pressed={language === l} onClick={() => onChange(l)}
          className={cn("min-h-11 min-w-11 rounded-control px-3 text-sm font-bold transition-colors duration-fast", language === l ? "bg-brand text-brand-ink" : "text-ink hover:bg-sunken")}
        >
          {t.languages[l]}
        </button>
      ))}
    </div>
  );
}
