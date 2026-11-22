import { describe, expect, it } from "vitest";
import { averageAmbient, scoreRoute } from "@/lib/route/exposure";
import type { Ambient, RawRoute } from "@/lib/route/types";

/** 08:00 IST is 02:30 UTC. */
const ist = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return new Date(Date.UTC(2026, 10, 22, h! - 5, m! - 30)).toISOString();
};
const flat = (ugm3: number): Ambient => ({ flat: ugm3, basis: "latest", approximate: false, station: "S", source: "OpenAQ", measuredAt: ist("12:00") });
const hourly = (byHour: Record<number, number>): Ambient => ({ ...flat(0), flat: undefined, basis: "hourly-profile", byHour: new Map(Object.entries(byHour).map(([h, v]) => [Number(h), v])) });
const hour: RawRoute = { distanceM: 5000, durationS: 3600, majorShare: 0 };

describe("estimated PM2.5 inhaled per mode (ambient 100 µg/m³, 1 h)", () => {
  // ambient × in-mode ratio (Goel 2015) × breathing rate (EPA EFH Table 6-2) × hours
  it.each([
    ["walk", 100.8], //  1.4 × 0.72 m³/h
    ["cycle", 171.6], //  1.1 × 1.56 m³/h
    ["two_wheeler", 32.8], // 1.3 × 0.252 m³/h
    ["car", 32.8],
  ] as const)("%s", (mode, expected) => expect(scoreRoute(mode, 1, hour, flat(100), ist("09:00")).pm25Ug).toBe(expected));

  it("scales linearly with duration and ambient concentration", () => {
    expect(scoreRoute("walk", 1, { ...hour, durationS: 1800 }, flat(100), ist("09:00")).pm25Ug).toBe(50.4);
    expect(scoreRoute("walk", 1, hour, flat(50), ist("09:00")).pm25Ug).toBe(50.4);
  });

  it("computes CO₂ from per-passenger-km factors", () => {
    const co2 = (mode: "walk" | "cycle" | "two_wheeler" | "car") => scoreRoute(mode, 1, hour, flat(100), ist("09:00")).co2Kg;
    expect([co2("walk"), co2("cycle"), co2("two_wheeler"), co2("car")]).toEqual([0, 0, 0.18, 0.65]);
  });

  it("reports rounded display values and ids", () => {
    const r = scoreRoute("car", 2, { distanceM: 12_345, durationS: 1234, majorShare: 0 }, flat(80), ist("09:00"));
    expect(r).toMatchObject({ id: "car-2", mode: "car", alt: 2, distanceKm: 12.3, durationMin: 21, ambientUgm3: 80 });
  });
});

describe("time-of-day ambient", () => {
  const profile = hourly({ ...Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, 100])), 8: 160, 15: 60, 23: 100, 0: 200 });

  it("the same trip costs more in the dirty hour than in the clean hour", () => {
    expect(scoreRoute("walk", 1, hour, profile, ist("08:00")).pm25Ug).toBe(161.3);
    expect(scoreRoute("walk", 1, hour, profile, ist("15:00")).pm25Ug).toBe(60.5);
  });
  it("weights each hour a trip passes through (07:30 + 60 min = half hour 7, half hour 8)", () => {
    expect(averageAmbient(profile.byHour!, ist("07:30"), 60)).toBe(130);
  });
  it("wraps past midnight and repeats the 24 h profile on later days", () => {
    expect(averageAmbient(profile.byHour!, ist("23:30"), 60)).toBe(150);
    const tomorrow = new Date(Date.parse(ist("08:00")) + 24 * 3_600_000).toISOString();
    expect(averageAmbient(profile.byHour!, tomorrow, 60)).toBe(160);
  });
  it("fills hours without data from the nearest hour", () => {
    const sparse = new Map([[8, 100], [20, 300]]);
    expect(averageAmbient(sparse, ist("09:00"), 30)).toBe(100);
    expect(averageAmbient(sparse, ist("19:00"), 30)).toBe(300);
  });
  it("handles zero-length trips", () => expect(averageAmbient(profile.byHour!, ist("08:00"), 0)).toBe(160));
});

describe("road-type adjustment", () => {
  const base = scoreRoute("two_wheeler", 1, hour, flat(100), ist("09:00"));
  it("is not applied when OSRM identifies no main road", () => expect(base.roadAdjustment).toBe("not-applied"));
  it("raises exposure by the main-road factor in proportion to the main-road share", () => {
    const half = scoreRoute("two_wheeler", 1, { ...hour, majorShare: 0.5 }, flat(100), ist("09:00"));
    const all = scoreRoute("two_wheeler", 1, { ...hour, majorShare: 1 }, flat(100), ist("09:00"));
    expect(half).toMatchObject({ roadAdjustment: "applied", majorShare: 0.5, pm25Ug: 35.2 }); // 32.76 × 1.075
    expect(all.pm25Ug).toBe(37.7); // 32.76 × 1.15
  });
});
