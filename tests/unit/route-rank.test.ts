import { describe, expect, it } from "vitest";
import { labelRoutes, sortAlternatives } from "@/lib/route/rank";
import { buildCards } from "@/lib/route/reason";
import type { RouteMode, ScoredRoute } from "@/lib/route/types";
import { extractNumbers } from "@/lib/ai/grounding";

const route = (mode: RouteMode, pm25Ug: number, durationMin: number, alt = 1): ScoredRoute =>
  ({ id: `${mode}-${alt}`, mode, alt, pm25Ug, durationMin, distanceKm: 5, co2Kg: 0, ambientUgm3: 80, majorShare: 0, roadAdjustment: "not-applied" });
const ids = (l: NonNullable<ReturnType<typeof labelRoutes>>) => [l.cleanest.id, l.fastest.id, l.balance.id];

describe("sortAlternatives", () => {
  it("orders by exposure, then duration, then OSRM order", () => {
    const sorted = sortAlternatives([route("car", 9, 20, 1), route("car", 5, 30, 2), route("car", 5, 25, 3), route("car", 5, 25, 4)]);
    expect(sorted.map((r) => r.alt)).toEqual([3, 4, 2, 1]);
  });
  it("copes with a single alternative and none", () => {
    expect(sortAlternatives([route("walk", 5, 30)])).toHaveLength(1);
    expect(sortAlternatives([])).toEqual([]);
  });
});

describe("labelRoutes", () => {
  it("returns null when no mode has a route", () => expect(labelRoutes([])).toBeNull());

  it("a single candidate holds all three labels", () => {
    expect(ids(labelRoutes([route("walk", 5, 30)])!)).toEqual(["walk-1", "walk-1", "walk-1"]);
  });

  it("picks cleanest, fastest and a distinct best-balance route from the combined rank", () => {
    const l = labelRoutes([route("walk", 1, 100), route("cycle", 100, 1), route("two_wheeler", 2, 2), route("car", 3, 3)])!;
    expect(ids(l)).toEqual(["walk-1", "cycle-1", "two_wheeler-1"]); // ranks: walk 1+4, cycle 4+1, two-wheeler 2+2 = 4
  });

  it("breaks an exposure tie by the faster route and a full tie by mode order", () => {
    expect(ids(labelRoutes([route("walk", 10, 40), route("car", 10, 20)])!)).toEqual(["car-1", "car-1", "car-1"]);
    expect(ids(labelRoutes([route("car", 10, 20), route("cycle", 10, 20)])!)).toEqual(["cycle-1", "cycle-1", "cycle-1"]);
  });

  it("breaks a duration tie by the cleaner route", () => {
    const l = labelRoutes([route("two_wheeler", 30, 20), route("car", 20, 20), route("walk", 90, 60)])!;
    expect(l.fastest.id).toBe("car-1");
  });

  it("breaks equal combined ranks by exposure (cleanest wins), never leaving balance undefined", () => {
    const l = labelRoutes([route("walk", 1, 100), route("car", 100, 1)])!; // both rank sum 3
    expect(l.balance.id).toBe("walk-1");
  });
});

describe("buildCards (computed one-line reasons)", () => {
  const labelled = labelRoutes([route("walk", 5, 60), route("cycle", 40, 10), route("two_wheeler", 6, 15), route("car", 50, 30)])!;

  it("groups labels per route and writes a computed reason for each", () => {
    const en = buildCards(labelled, "en");
    expect(en.map((c) => [c.route.id, c.labels])).toEqual([["walk-1", ["cleanest"]], ["cycle-1", ["fastest"]], ["two_wheeler-1", ["balance"]]]);
    expect(en[0]!.reason).toBe("Lowest estimated PM2.5 inhaled (5 µg): 88% less than the fastest option, for 50 min more.");
    expect(en[1]!.reason).toBe("Quickest at 10 min, inhaling an estimated 40 µg (700% more than the cleanest option).");
    expect(en[2]!.reason).toBe("Best trade-off: an estimated 6 µg inhaled (20% above the cleanest) in 15 min (5 min longer than the fastest).");
  });

  it("uses one combined sentence when one route is both cleanest and fastest", () => {
    const [card] = buildCards(labelRoutes([route("car", 5, 10), route("walk", 50, 60)])!, "en");
    expect(card!.labels).toEqual(["cleanest", "fastest", "balance"]);
    expect(card!.reason).toBe("Lowest estimated PM2.5 inhaled (5 µg) and the quickest (10 min).");
  });

  it("never calls exposure measured, and carries identical numbers in Hindi", () => {
    const en = buildCards(labelled, "en");
    const hi = buildCards(labelled, "hi");
    const figures = (text: string) => extractNumbers(text.replace(/PM2\.5/g, "")).sort(); // "PM2.5" is a name, not a figure
    hi.forEach((c, i) => {
      expect(figures(c.reason)).toEqual(figures(en[i]!.reason));
      expect(c.reason).toMatch(/[ऀ-ॿ]/);
    });
    expect(en.every((c) => /estimated/.test(c.reason) && !/measured/i.test(c.reason))).toBe(true);
  });
});
