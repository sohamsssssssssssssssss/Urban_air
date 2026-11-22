import { describe, expect, it } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import { buildFacts } from "@/lib/impact/facts";
import { commuteOverlap } from "@/lib/impact/timing";
import { extractNumbers } from "@/lib/ai/grounding";
import { profile, snapshot } from "../fixtures/data";

/** 24 hourly PM2.5 points where 06-09 IST is the dirtiest window and 14-17 the cleanest. */
const history = Array.from({ length: 24 }, (_, hour) => ({
  at: new Date(Date.UTC(2026, 10, 22, hour - 6, 30)).toISOString(), // UTC for `hour`:00 IST
  pm25: [6, 7, 8].includes(hour) ? 160 : [14, 15, 16].includes(hour) ? 60 : 100,
}));
const snap: AQSnapshot = { ...snapshot, aqi: 150, category: "Moderate", history };
const twoWheeler = { ...profile, kids: false, commuteMode: "two_wheeler" as const, commuteKm: 10, workStartHour: 9, workEndHour: 18 };
const overlapFact = (p = twoWheeler, lang: "en" | "hi" = "en") => buildFacts(snap, p, true, lang).find((f) => f.id === "commute_overlap");

describe("commuteOverlap", () => {
  const worst = { start: 6, end: 9 };
  it("finds the user's trip to work inside the dirtiest window (9:00 start, 24 min ride)", () => {
    expect(commuteOverlap(worst, twoWheeler)).toEqual({ leg: "to-work", leave: "08:36", arrive: "09:00", minutes: 24, tripMinutes: 24 });
  });
  it("counts only the part of the trip inside the window", () => {
    expect(commuteOverlap({ start: 8, end: 9 }, { ...twoWheeler, commuteKm: 25 })).toMatchObject({ leave: "08:00", minutes: 60, tripMinutes: 60 });
    expect(commuteOverlap({ start: 6, end: 8.5 }, { ...twoWheeler, workStartHour: 9, commuteKm: 25 })).toMatchObject({ minutes: 30 });
  });
  it("detects the trip home when that is the overlapping leg", () => {
    expect(commuteOverlap({ start: 17, end: 20 }, { ...twoWheeler, commuteMode: "car", commuteKm: 11 })).toMatchObject({ leg: "home", leave: "18:00", arrive: "18:30", minutes: 30 });
  });
  it("returns null without overlap, without a measured window, or when working from home", () => {
    expect(commuteOverlap(worst, { ...twoWheeler, workStartHour: 12, workEndHour: 19 })).toBeNull();
    expect(commuteOverlap(undefined, twoWheeler)).toBeNull();
    expect(commuteOverlap(worst, { ...twoWheeler, commuteKm: 0 })).toBeNull();
  });
  it("formats clock times across midnight", () => {
    expect(commuteOverlap({ start: -1, end: 0 }, { ...twoWheeler, workStartHour: 0 })).toMatchObject({ leave: "23:36", arrive: "00:00" });
  });
});

describe("commute_overlap fact", () => {
  it("adds a routine item with why and a computed impact for the production scenario", () => {
    const f = overlapFact()!;
    expect(f.section).toBe("routines");
    expect(f.action).toContain("two-wheeler commute runs through this station's dirtiest hours (06:00–09:00)");
    expect(f.action).toMatch(/cleaner window \(14:00–17:00\).*N95\/FFP2 mask.*less congested side roads/);
    expect(f.why).toBe("You travel 08:36–09:00 (to work), inside the dirtiest window (06:00–09:00), when this station averaged 160 µg/m³ over the last 24 h.");
    // 0.1310 m³ breathed per trip (ratio 1.3 × 0.252 m³/h × 0.4 h) × (160 − 60) µg/m³ = 13.1 µg
    expect(f.impact).toBe("Travelling in 14:00–17:00 (average 60 µg/m³) instead would cut PM2.5 on this trip by 63%, about 13.1 µg less inhaled; an N95 mask removes at least 95% of fine particles on top.");
    expect(f.personalizedFor).toBe("Your two-wheeler commute, 10 km");
    expect(f.priority).toBe("medium");
  });

  it("is high priority in Poor air and uses cabin advice (no mask claim) for enclosed vehicles", () => {
    const poor = buildFacts({ ...snap, aqi: 250, category: "Poor" }, { ...twoWheeler, commuteMode: "car" }, true).find((f) => f.id === "commute_overlap")!;
    expect(poor.priority).toBe("high");
    expect(poor.action).toContain("AC recirculation");
    expect(poor.impact).not.toContain("N95");
  });

  it("is absent when the commute avoids the dirtiest window or there is no measured history", () => {
    expect(overlapFact({ ...twoWheeler, workStartHour: 12, workEndHour: 19 })).toBeUndefined();
    expect(buildFacts({ ...snap, history: undefined }, twoWheeler, true).some((f) => f.id === "commute_overlap")).toBe(false);
  });

  it("carries identical numbers in English and Hindi", () => {
    const en = overlapFact()!;
    const hi = overlapFact(twoWheeler, "hi")!;
    expect(extractNumbers(hi.impact).sort()).toEqual(extractNumbers(en.impact).sort());
    expect(extractNumbers(hi.why).sort()).toEqual(extractNumbers(en.why).sort());
    expect(hi.action).toMatch(/[ऀ-ॿ]/);
    expect(hi.impact).toContain("13.1");
  });
});
