import { describe, expect, it } from "vitest";
import { extractNumbers } from "@/lib/ai/grounding";
import type { AQSnapshot } from "@/lib/aq/types";
import { buildFacts } from "@/lib/impact/facts";
import { AdviceRequestSchema, ChatRequestSchema } from "@/lib/requests";
import { liveSnapshot, location, profile, snapshot } from "../fixtures/data";

const live = liveSnapshot as AQSnapshot;
const at = (aqi: number, s = live): AQSnapshot => ({ ...s, aqi });
const households = [
  profile,
  { ...profile, kids: true, commuteMode: "two_wheeler" as const, commuteKm: 10, ownsPurifier: true, budget: "high" as const },
  { ...profile, kids: true, elderly: true, respiratory: true, pets: true, commuteMode: "walk" as const, commuteKm: 3, budget: "medium" as const },
];
const readings = [at(374), at(150), at(80), snapshot];
const JARGON = /µg\/m³|CADR|mass-balance|PM2\.5|PM10|MERV|NIOSH|sub-index/i;
/**
 * Computed figures only. "PM2.5"/"PM10" are pollutant names, "0.3 µm" is the NIOSH filter-test particle size and
 * "(Singer et al. 2012)" is a citation; the kid wording drops all three as jargon, and none is a computed result.
 */
const sorted = (text: string) => extractNumbers(text.replace(/PM2\.5|PM10|0\.3 µm|\([^()]*\b(?:19|20)\d{2}\)/g, "")).sort();
const KID_SECTIONS = new Set(["routines", "indoor"]);

describe("kid-friendly facts keep every number and only change the wording", () => {
  for (const lang of ["en", "hi"] as const) {
    it(`${lang}: same facts, identical numbers in every field, for all households and readings`, () => {
      for (const s of readings) {
        for (const p of households) {
          const std = buildFacts(s, p, true, lang);
          const kid = buildFacts(s, p, true, lang, "kids");
          expect(kid.map((f) => `${f.id}:${f.section}:${f.priority}`)).toEqual(std.map((f) => `${f.id}:${f.section}:${f.priority}`));
          kid.forEach((f, i) => {
            expect(sorted(f.impact), `${f.id} impact`).toEqual(sorted(std[i]!.impact));
          });
        }
      }
    });
  }

  it("rewords routine and indoor tips but leaves the greener-choice tips untouched", () => {
    const std = buildFacts(at(374), households[1]!, true, "en");
    const kid = buildFacts(at(374), households[1]!, true, "en", "kids");
    kid.forEach((f, i) => {
      if (KID_SECTIONS.has(f.section)) expect(f.action, f.id).not.toBe(std[i]!.action);
      else expect(f, f.id).toEqual(std[i]);
    });
    expect(kid.some((f) => f.section === "alternatives")).toBe(true);
  });

  it("uses no technical terms in kid-worded tips (English and Hindi)", () => {
    for (const lang of ["en", "hi"] as const) {
      for (const f of buildFacts(at(374), households[2]!, true, lang, "kids").filter((x) => KID_SECTIONS.has(x.section))) {
        for (const field of [f.action, f.why, f.impact, f.personalizedFor]) expect(field, `${lang} ${f.id}`).not.toMatch(JARGON);
      }
    }
  });

  it("speaks Hindi in the Hindi kid copy", () => {
    for (const f of buildFacts(at(374), households[1]!, true, "hi", "kids").filter((x) => KID_SECTIONS.has(x.section))) expect(f.action).toMatch(/[ऀ-ॿ]/);
  });

  it("never tells a child to wear an N95 (NIOSH has approved none for children)", () => {
    const mask = (lang: "en" | "hi") => buildFacts(at(374), households[1]!, true, lang, "kids").find((f) => f.id === "n95_mask")!;
    expect(mask("en").action).toMatch(/^Grown-ups: .*N95s are made for adults, so kids should spend less time outdoors/);
    expect(mask("hi").action).toMatch(/^बड़े लोग: .*वयस्कों के लिए बने हैं, इसलिए बच्चे बाहर कम समय बिताएँ/);
    const overlap = buildFacts({ ...live, history: live.history }, { ...households[1]!, commuteMode: "two_wheeler", workStartHour: 9 }, true, "en", "kids").find((f) => f.id === "commute_overlap");
    if (overlap) expect(overlap.action).toContain("grown-ups can wear");
  });

  it("is the default tone only when asked: standard stays unchanged", () => {
    expect(buildFacts(live, profile, true, "en")).toEqual(buildFacts(live, profile, true, "en", "standard"));
  });
});

describe("request schema", () => {
  const base = { location, profile, language: "en" };
  it("defaults the advice tone to standard and accepts kids", () => {
    expect(AdviceRequestSchema.parse(base).tone).toBe("standard");
    expect(AdviceRequestSchema.parse({ ...base, tone: "kids" }).tone).toBe("kids");
  });
  it("rejects an unknown tone, and chat does not accept a tone at all", () => {
    expect(AdviceRequestSchema.safeParse({ ...base, tone: "toddler" }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ ...base, message: "hi", history: [] }).success).toBe(true);
    expect(ChatRequestSchema.safeParse({ ...base, message: "hi", history: [], tone: "kids" }).success).toBe(false);
  });
});
