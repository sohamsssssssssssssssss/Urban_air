import { describe, expect, it } from "vitest";
import { ALERT_STRINGS } from "@/features/alerts/strings";
import { CHECKLIST_STRINGS } from "@/features/checklist/strings";
import { COMPARE_STRINGS } from "@/features/compare/strings";
import { MASK_STRINGS } from "@/features/mask/strings";
import { OUTLOOK_STRINGS } from "@/features/outlook/strings";
import { TODAY_STRINGS } from "@/features/today/strings";

/** Every feature's English and Hindi dictionaries. Add each new feature here. */
const DICTIONARIES: Record<string, { en: unknown; hi: unknown }> = {
  today: TODAY_STRINGS,
  mask: MASK_STRINGS,
  checklist: CHECKLIST_STRINGS,
  outlook: OUTLOOK_STRINGS,
  compare: COMPARE_STRINGS,
  alerts: ALERT_STRINGS,
};

const DEVANAGARI = /[ऀ-ॿ]/;
/** Strings that are legitimately the same in both languages (units, acronyms, URLs). */
const LANGUAGE_NEUTRAL = /^[A-Za-z0-9 .,:;/%()+\-–µ³²₂]*$/;

function walk(en: unknown, hi: unknown, path: string, problems: string[]): void {
  if (typeof en === "string") {
    if (typeof hi !== "string") return void problems.push(`${path}: Hindi is not a string`);
    if (hi === "") problems.push(`${path}: Hindi is empty`);
    else if (!DEVANAGARI.test(hi) && !LANGUAGE_NEUTRAL.test(hi)) problems.push(`${path}: Hindi has no Devanagari ("${hi}")`);
  } else if (typeof en === "function") {
    if (typeof hi !== "function") problems.push(`${path}: Hindi is not a function`);
  } else if (Array.isArray(en)) {
    if (!Array.isArray(hi) || hi.length !== en.length) return void problems.push(`${path}: Hindi array length differs`);
    en.forEach((item, i) => walk(item, hi[i], `${path}[${i}]`, problems));
  } else if (en && typeof en === "object") {
    const h = (hi ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(en)) {
      if (!(key in h)) problems.push(`${path}.${key}: missing in Hindi`);
      else walk((en as Record<string, unknown>)[key], h[key], `${path}.${key}`, problems);
    }
  }
}

describe("feature dictionaries: English and Hindi stay in step", () => {
  it.each(Object.entries(DICTIONARIES))("%s", (_, d) => {
    const problems: string[] = [];
    walk(d.en, d.hi, "", problems);
    expect(problems).toEqual([]);
  });
});
