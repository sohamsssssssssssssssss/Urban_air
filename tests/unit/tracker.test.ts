import { describe, expect, it } from "vitest";
import { MAX_TRIPS } from "@/features/tracker/constants";
import { ambientPm25 } from "@/features/tracker/ambient";
import { addTrip, inPeriod, removeTrip, toCsv, totals, tripImpact, weekStart } from "@/features/tracker/logic";
import { TrackerStateSchema, TripSchema, type TrackerState, type Trip } from "@/features/tracker/schema";
import type { AQSnapshot } from "@/lib/aq/types";
import { snapshot } from "../fixtures/data";

const NOW = Date.parse("2026-11-25T06:00:00Z"); // Wed 25 Nov, 11:30 IST
const trip = (over: Partial<Trip> = {}): Trip => ({ id: "t1", date: "2026-11-25", mode: "metro", km: 10, source: "manual", ambientUgm3: 100, ...over });
const empty: TrackerState = { baseline: "car", trips: [] };

describe("tripImpact (estimates against the baseline mode)", () => {
  it("CO₂ avoided = baseline factor × km − actual factor × km (car 0.13, metro 0.015 kg/km)", () => {
    const i = tripImpact(trip(), "car");
    expect(i.co2Kg).toBeCloseTo(0.15, 6);
    expect(i.co2AvoidedKg).toBeCloseTo(1.15, 6);
  });
  it("PM2.5 avoided uses the trip-dose model at the stored ambient level", () => {
    // dose = in-mode ratio × breathing rate (m³/h) × hours; car 1.3×0.252×(10/22), metro 0.8×0.252×(10/30), ambient 100 µg/m³
    const i = tripImpact(trip(), "car");
    expect(i.pm25Ug).toBeCloseTo(6.72, 2);
    expect(i.pm25AvoidedUg).toBeCloseTo(14.891 - 6.72, 2);
  });
  it("reports extra emissions and exposure as negative savings, and nothing for the baseline mode", () => {
    const worse = tripImpact(trip({ mode: "car" }), "metro");
    expect(worse.co2AvoidedKg).toBeLessThan(0);
    expect(worse.pm25AvoidedUg!).toBeLessThan(0);
    const same = tripImpact(trip({ mode: "car" }), "car");
    expect(same.co2AvoidedKg).toBe(0);
    expect(same.pm25AvoidedUg).toBe(0);
  });
  it("does not estimate PM2.5 when the ambient level was unknown", () => {
    expect(tripImpact(trip({ ambientUgm3: null }), "car")).toMatchObject({ pm25Ug: null, pm25AvoidedUg: null });
  });
  it("counts walking and cycling as zero-emission", () => {
    expect(tripImpact(trip({ mode: "walk" }), "car").co2AvoidedKg).toBeCloseTo(1.3, 6);
  });
});

describe("periods (India time, weeks start on Monday)", () => {
  it("finds the Monday of a week", () => {
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday
    expect(weekStart("2026-11-23")).toBe("2026-11-23"); // Monday
    expect(weekStart("2026-11-29")).toBe("2026-11-23");
    expect(weekStart("2026-01-01")).toBe("2025-12-29"); // crosses the year
  });
  it("includes this week/month and excludes others", () => {
    expect(inPeriod(trip({ date: "2026-11-23" }), "week", "2026-11-25")).toBe(true);
    expect(inPeriod(trip({ date: "2026-11-22" }), "week", "2026-11-25")).toBe(false);
    expect(inPeriod(trip({ date: "2026-11-01" }), "month", "2026-11-25")).toBe(true);
    expect(inPeriod(trip({ date: "2026-10-31" }), "month", "2026-11-25")).toBe(false);
    expect(inPeriod(trip({ date: "2020-01-01" }), "all", "2026-11-25")).toBe(true);
  });
  it("sums trips, distance and savings per period, and leaves PM2.5 unknown when no trip had an ambient level", () => {
    const trips = [trip({ id: "a", date: "2026-11-25" }), trip({ id: "b", date: "2026-11-24", km: 5 }), trip({ id: "c", date: "2026-11-10", ambientUgm3: null }), trip({ id: "d", date: "2026-10-01", ambientUgm3: null })];
    const week = totals(trips, "car", "week", NOW);
    expect(week).toMatchObject({ trips: 2, km: 15 });
    expect(week.co2AvoidedKg).toBeCloseTo(1.15 + 0.575, 6);
    expect(week.pm25AvoidedUg).toBeGreaterThan(0);
    expect(totals(trips, "car", "month", NOW).trips).toBe(3);
    expect(totals(trips, "car", "all", NOW).trips).toBe(4);
    expect(totals([trips[2]!], "car", "all", NOW).pm25AvoidedUg).toBeNull();
    expect(totals([], "car", "week", NOW)).toEqual({ trips: 0, km: 0, co2AvoidedKg: 0, pm25AvoidedUg: null });
  });
});

describe("addTrip / removeTrip", () => {
  const input = { date: "2026-11-25", mode: "cycle" as const, km: 4.5, source: "manual" as const, ambientUgm3: 80 };
  it("adds a validated trip, newest first", () => {
    const one = addTrip(empty, input, "a", NOW);
    expect(one.ok && one.state.trips).toEqual([{ ...input, id: "a" }]);
    const two = one.ok ? addTrip(one.state, { ...input, date: "2026-11-24" }, "b", NOW) : one;
    expect(two.ok && two.state.trips.map((t) => t.id)).toEqual(["b", "a"]);
  });
  it.each([
    ["zero distance", { km: 0 }], ["distance over 100 km", { km: 101 }], ["unknown mode", { mode: "rocket" }],
    ["bad date format", { date: "25/11/2026" }], ["negative ambient", { ambientUgm3: -1 }], ["NaN distance", { km: Number.NaN }],
  ])("rejects %s", (_, bad) => expect(addTrip(empty, { ...input, ...bad } as never, "x", NOW)).toEqual({ ok: false, error: "invalid" }));
  it("rejects a date in the future (India time)", () => {
    expect(addTrip(empty, { ...input, date: "2026-11-26" }, "x", NOW)).toEqual({ ok: false, error: "future" });
    expect(addTrip(empty, { ...input, date: "2026-11-26" }, "x", Date.parse("2026-11-25T19:00:00Z")).ok).toBe(true); // 00:30 IST on the 26th
  });
  it("keeps at most MAX_TRIPS, dropping the oldest", () => {
    const full: TrackerState = { baseline: "car", trips: Array.from({ length: MAX_TRIPS }, (_, i) => trip({ id: `old${i}` })) };
    const next = addTrip(full, input, "new", NOW);
    expect(next.ok && next.state.trips).toHaveLength(MAX_TRIPS);
    expect(next.ok && next.state.trips[0]!.id).toBe("new");
    expect(next.ok && next.state.trips.at(-1)!.id).toBe(`old${MAX_TRIPS - 2}`);
  });
  it("removes by id", () => {
    expect(removeTrip({ baseline: "car", trips: [trip({ id: "a" }), trip({ id: "b" })] }, "a").trips.map((t) => t.id)).toEqual(["b"]);
  });
});

describe("toCsv", () => {
  it("writes a header and one row per trip with computed values, blank for unknown ambient", () => {
    const csv = toCsv({ baseline: "car", trips: [trip({ id: "a" }), trip({ id: "b", ambientUgm3: null, mode: "walk", km: 2.5, source: "route" })] });
    const [header, a, b, end] = csv.split("\n");
    expect(header).toBe("date,mode,km,source,ambient_pm25_ugm3,co2_kg,baseline_mode,co2_avoided_kg,pm25_inhaled_ug_est,pm25_avoided_ug_est");
    expect(a).toBe("2026-11-25,metro,10,manual,100,0.15,car,1.15,6.72,8.17");
    expect(b).toBe("2026-11-25,walk,2.5,route,,0,car,0.33,,");
    expect(end).toBe("");
  });
  it("has only a header when there are no trips", () => expect(toCsv(empty).trim().split("\n")).toHaveLength(1));
});

describe("schemas and ambient", () => {
  it("validates the stored state strictly", () => {
    expect(TrackerStateSchema.safeParse({ baseline: "car", trips: [trip()] }).success).toBe(true);
    expect(TrackerStateSchema.safeParse({ baseline: "jetpack", trips: [] }).success).toBe(false);
    expect(TrackerStateSchema.safeParse({ baseline: "car", trips: [{ ...trip(), extra: 1 }] }).success).toBe(false);
    expect(TripSchema.safeParse(trip({ id: "" })).success).toBe(false);
  });
  it("takes the measured PM2.5, or infers it from a CPCB sub-index, or gives null", () => {
    expect(ambientPm25({ ...snapshot, pollutants: { pm25: 88.56 } } as AQSnapshot)).toBe(88.6);
    expect(ambientPm25({ ...snapshot, pollutants: {}, subIndices: { pm25: 100 } } as AQSnapshot)).toBe(60);
    expect(ambientPm25({ ...snapshot, pollutants: {}, subIndices: {} } as AQSnapshot)).toBeNull();
  });
});
