import { describe, expect, it } from "vitest";
import { extractNumbers } from "@/lib/ai/grounding";
import { bestOutdoorWindow, ruleBasedAdvice, ruleSummary } from "@/lib/ai/fallback";
import type { AQSnapshot } from "@/lib/aq/types";
import { CATEGORY_LABEL, HEALTH_IMPACT, MODE_NAME, UI, errorMessage } from "@/lib/i18n";
import { buildFacts } from "@/lib/impact/facts";
import { liveSnapshot, profile, snapshot } from "../fixtures/data";

const live = liveSnapshot as AQSnapshot;
const profiles = [
  profile,
  { ...profile, commuteMode: "two_wheeler" as const, commuteKm: 3, ownsPurifier: true, budget: "high" as const, kids: false },
  { ...profile, commuteKm: 0, respiratory: true, elderly: true, pets: true, budget: "medium" as const },
];
const sorted = (text: string) => extractNumbers(text).sort();

describe("Hindi fact copy", () => {
  it.each([["synthetic Very Poor", snapshot], ["live Delhi with history", live], ["clean air", { ...snapshot, aqi: 80, category: "Satisfactory" as const }]])(
    "has the same facts and identical numbers as English (%s)",
    (_, s) => {
      for (const p of profiles) {
        const en = buildFacts(s, p, true, "en");
        const hi = buildFacts(s, p, true, "hi");
        expect(hi.map((f) => f.id)).toEqual(en.map((f) => f.id));
        hi.forEach((f, i) => {
          expect(sorted(f.impact)).toEqual(sorted(en[i]!.impact));
          expect(f.action).toMatch(/[ऀ-ॿ]/);
        });
      }
    },
  );

  it("rule-based fallback is fully Hindi with grounded station and time", () => {
    const advice = ruleBasedAdvice(live, buildFacts(live, profile, true, "hi"), "hi");
    expect(advice.summary).toContain("Talkatora Garden, Delhi - DPCC पर AQI 195 (मध्यम)");
    expect(advice.summary).toContain("22 Nov, 18:00 IST");
    expect(bestOutdoorWindow(live, "hi")).toMatch(/^14:00–17:00 \(पिछले 24 घंटों/);
    expect(ruleSummary({ ...live, stale: true }, "hi")).toContain("3 घंटे से ज़्यादा पुरानी");
  });

  it("English fallback uses the station's measured window", () => {
    expect(bestOutdoorWindow(live, "en")).toMatch(/^14:00–17:00 \(lowest PM2.5 at this station over the last 24 h, \d+ µg\/m³\)\.$/);
    expect(bestOutdoorWindow({ ...live, aqi: 420 }, "en")).toMatch(/^Avoid outdoor exertion today/);
  });
});

describe("dictionaries", () => {
  it("cover every category, mode and UI section in both languages", () => {
    for (const lang of ["en", "hi"] as const) {
      expect(Object.keys(CATEGORY_LABEL[lang])).toHaveLength(6);
      expect(Object.keys(HEALTH_IMPACT[lang])).toHaveLength(6);
      expect(Object.keys(MODE_NAME[lang])).toHaveLength(7);
      expect(Object.keys(UI[lang])).toEqual(["form", "card", "plan", "chat", "errors"]);
    }
    expect(UI.hi.form.kmError(100)).toBe("0 से 100 कि.मी. के बीच दूरी लिखें।");
  });

  it("localises API errors, falling back to the server message", () => {
    expect(errorMessage("hi", "RATE_LIMITED")).toContain("एक मिनट");
    expect(errorMessage("en", "UNKNOWN", "Server says no")).toBe("Server says no");
    expect(errorMessage("en")).toBe(UI.en.errors.NETWORK);
  });
});
