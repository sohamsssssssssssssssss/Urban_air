"use client";

import { useEffect, useId, useState } from "react";
import { THEME_STORAGE_KEY } from "@/design/themeScript";
import { readValue, writeStored } from "@/features/shared/storage";
import { SHELL } from "@/lib/i18n.shell";
import type { Language } from "@/lib/i18n";

type Choice = "system" | "light" | "dark";
const CHOICES: Choice[] = ["system", "light", "dark"];
const KEY = THEME_STORAGE_KEY.replace("smogsense:v1:", "");

/** Light / dark / match-device. Saved on this device and applied immediately (a small script re-applies it before first paint). */
export default function ThemeSwitch({ language }: { language: Language }) {
  const id = useId();
  const t = SHELL[language].theme;
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    const saved = readValue(KEY);
    if (saved === "light" || saved === "dark") setChoice(saved);
  }, []);

  function choose(next: Choice) {
    setChoice(next);
    writeStored(KEY, next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <fieldset>
      <legend className="font-bold">{t.label}</legend>
      <p id={`${id}-hint`} className="text-sm text-ink-muted">{t.hint}</p>
      <div className="mt-2 flex flex-wrap gap-x-6">
        {CHOICES.map((c) => (
          <label key={c} className="flex min-h-11 items-center gap-3">
            <input type="radio" name={`${id}-theme`} className="h-5 w-5 accent-brand" checked={choice === c} onChange={() => choose(c)} aria-describedby={`${id}-hint`} />
            {t[c]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
