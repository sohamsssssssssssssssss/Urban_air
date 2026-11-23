import { describe, expect, it } from "vitest";
import { CardQuerySchema } from "@/features/share/schema";
import { todayCardUrl, weeklyCardUrl, weeklyNumbers } from "@/features/share/logic";
import { cityOrDefault } from "@/features/share/city";
import { TrackerStateSchema, type TrackerState, type Trip } from "@/features/tracker/schema";

const NOW = Date.parse("2026-11-25T06:00:00Z");
const trip = (over: Partial<Trip>): Trip => ({ id: "t", date: "2026-11-25", mode: "metro", km: 10, source: "manual", ambientUgm3: 100, ...over });
const state: TrackerState = { baseline: "car", trips: [trip({ id: "a" }), trip({ id: "b", km: 5, date: "2026-11-24" }), trip({ id: "old", date: "2026-10-01" })] };
const query = (url: string) => Object.fromEntries(new URL(url, "http://x").searchParams);

describe("share URLs always satisfy the API's own schema (round trip)", () => {
  it("today", () => {
    const url = todayCardUrl("Mumbai", "hi");
    expect(url).toBe("/api/card?kind=today&city=Mumbai&lang=hi");
    expect(CardQuerySchema.parse(query(url))).toEqual({ kind: "today", city: "Mumbai", lang: "hi" });
  });
  it("weekly, from the device's tracker totals", () => {
    const n = weeklyNumbers(state, "week", NOW);
    expect(n.trips).toBe(2);
    expect(n.km).toBe(15);
    expect(n.co2).toBeCloseTo(1.725, 3);
    const parsed = CardQuerySchema.parse(query(weeklyCardUrl(n, "week", "en")));
    expect(parsed).toMatchObject({ kind: "weekly", period: "week", trips: 2, km: 15, co2: 1.7, lang: "en" });
  });
  it("covers the month and all-time periods", () => {
    expect(weeklyNumbers(state, "month", NOW).trips).toBe(2);
    expect(weeklyNumbers(state, "all", NOW).trips).toBe(3);
  });
  it("handles negative savings, a large total and no trips", () => {
    const worse = weeklyNumbers({ baseline: "metro", trips: [trip({ mode: "car", km: 80 })] }, "all", NOW);
    expect(worse.co2).toBeLessThan(0);
    const parsed = CardQuerySchema.parse(query(weeklyCardUrl(worse, "all", "en")));
    expect(parsed).toMatchObject({ kind: "weekly", co2: expect.any(Number) });
    expect((parsed as { co2: number }).co2).toBeLessThan(0);
    expect(weeklyNumbers({ baseline: "car", trips: [] }, "week", NOW)).toEqual({ trips: 0, km: 0, co2: 0, pm25: 0 });
  });
  it("leaves PM2.5 at 0 when no trip had a known air level", () => {
    expect(weeklyNumbers({ baseline: "car", trips: [trip({ ambientUgm3: null })] }, "all", NOW).pm25).toBe(0);
  });
  it("accepts what the tracker saves", () => expect(TrackerStateSchema.safeParse(state).success).toBe(true));
  it("falls back to the first city for an unknown one", () => {
    expect(cityOrDefault("Pune")).toBe("Pune");
    expect(cityOrDefault("Atlantis")).toBe("Delhi");
    expect(cityOrDefault(undefined)).toBe("Delhi");
  });
});

describe("CardQuerySchema", () => {
  const weekly = { kind: "weekly", lang: "en", period: "week", trips: "5", km: "62.5", co2: "7.2", pm25: "140.4" };
  it("accepts valid queries and converts numbers", () => {
    expect(CardQuerySchema.safeParse({ kind: "today", city: "Delhi", lang: "en" }).success).toBe(true);
    expect(CardQuerySchema.parse(weekly)).toMatchObject({ trips: 5, km: 62.5, co2: 7.2, pm25: 140.4 });
    expect(CardQuerySchema.safeParse({ ...weekly, co2: "-3.5" }).success).toBe(true);
  });
  it.each([
    ["an unknown kind", { kind: "monthly", lang: "en" }],
    ["an unknown city", { kind: "today", city: "Atlantis", lang: "en" }],
    ["an unknown language", { kind: "today", city: "Delhi", lang: "fr" }],
    ["a missing language", { kind: "today", city: "Delhi" }],
    ["an extra parameter on today", { kind: "today", city: "Delhi", lang: "en", name: "Asha" }],
    ["an extra parameter on weekly", { ...weekly, name: "Asha" }],
    ["a city on a weekly card", { ...weekly, city: "Delhi" }],
    ["an empty number (would have been 0)", { ...weekly, co2: "" }],
    ["a non-numeric number", { ...weekly, km: "abc" }],
    ["exponent notation", { ...weekly, km: "1e3" }],
    ["whitespace in a number", { ...weekly, km: " 5" }],
    ["too many decimals", { ...weekly, km: "5.1234" }],
    ["a fractional trip count", { ...weekly, trips: "2.5" }],
    ["a negative trip count", { ...weekly, trips: "-1" }],
    ["too many trips", { ...weekly, trips: "1001" }],
    ["too many kilometres", { ...weekly, km: "100001" }],
    ["CO2 out of range", { ...weekly, co2: "10001" }],
    ["PM2.5 out of range", { ...weekly, pm25: "-1000001" }],
    ["an unknown period", { ...weekly, period: "year" }],
    ["a very long number", { ...weekly, km: "1".repeat(50) }],
    ["no parameters", {}],
  ])("rejects %s", (_, bad) => expect(CardQuerySchema.safeParse(bad).success).toBe(false));
});
