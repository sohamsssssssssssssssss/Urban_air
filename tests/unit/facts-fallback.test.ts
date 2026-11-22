import { describe, expect, it } from "vitest";
import { bestOutdoorWindow, ruleBasedAdvice, ruleSummary } from "@/lib/ai/fallback";
import { AdviceSchema } from "@/lib/ai/schema";
import { buildFacts } from "@/lib/impact/facts";
import { profile, snapshot } from "../fixtures/data";

const ids = (p = profile, s = snapshot, metro = true) => buildFacts(s, p, metro).map((f) => f.id);

describe("buildFacts", () => {
  it("covers all three PS areas with quantified impact for a car commuter in Very Poor air", () => {
    const facts = buildFacts(snapshot, profile, true);
    expect(new Set(facts.map((f) => f.section))).toEqual(new Set(["routines", "indoor", "alternatives"]));
    expect(ids()).toEqual(expect.arrayContaining(["outdoor_timing", "n95_mask", "exercise_indoors", "commute_exposure", "purifier", "transit_switch", "carpool", "wfh_day", "no_burning"]));
    for (const f of facts) expect(f.impact.length).toBeGreaterThan(10);
  });

  it("personalises for children and the low budget", () => {
    const facts = buildFacts(snapshot, profile, true);
    expect(facts.find((f) => f.id === "exercise_indoors")?.personalizedFor).toContain("your child");
    expect(facts.find((f) => f.id === "purifier")?.action).toContain("DIY");
  });

  it("uses the bus when the city has no metro, and omits switches for transit users", () => {
    expect(buildFacts(snapshot, profile, false).find((f) => f.id === "transit_switch")?.action).toContain("bus");
    expect(ids({ ...profile, commuteMode: "metro" })).not.toContain("transit_switch");
  });

  it("drops masks and adds active travel in clean air for short trips", () => {
    const clean = { ...snapshot, aqi: 80, category: "Satisfactory" as const };
    const short = { ...profile, kids: false, commuteMode: "two_wheeler" as const, commuteKm: 3, ownsPurifier: true, budget: "high" as const };
    const got = ids(short, clean);
    expect(got).not.toContain("n95_mask");
    expect(got).toContain("active_short_trips");
    expect(buildFacts(clean, short, true).find((f) => f.id === "purifier")?.action).toContain("Run your purifier");
  });

  it("handles work-from-home profiles and HEPA budgets", () => {
    const wfh = { ...profile, commuteKm: 0, budget: "medium" as const, respiratory: true };
    expect(ids(wfh)).not.toEqual(expect.arrayContaining(["commute_exposure", "transit_switch", "wfh_day"]));
    expect(buildFacts(snapshot, wfh, true).find((f) => f.id === "purifier")?.action).toContain("HEPA");
  });
});

describe("rule-based fallback", () => {
  it("produces schema-valid advice sorted by priority", () => {
    const advice = ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true));
    expect(AdviceSchema.safeParse(advice).success).toBe(true);
    const order = { high: 0, medium: 1, low: 2 };
    const ranks = advice.indoor.map((i) => order[i.priority]);
    expect(ranks).toEqual([...ranks].sort());
  });

  it("summary cites AQI, station and time; flags stale data", () => {
    expect(ruleSummary(snapshot)).toMatch(/AQI 374 \(Very Poor\) at Anand Vihar, Delhi, measured 22 Nov, 16:30 IST/);
    expect(ruleSummary({ ...snapshot, stale: true })).toContain("more than 3 hours old");
  });

  it("best outdoor window warns on Severe days", () => {
    expect(bestOutdoorWindow(snapshot)).toMatch(/^13:00–17:00/);
    expect(bestOutdoorWindow({ ...snapshot, aqi: 450 })).toMatch(/^Avoid outdoor exertion/);
  });
});
