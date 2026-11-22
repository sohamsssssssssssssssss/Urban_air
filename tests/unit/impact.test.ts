import { describe, expect, it } from "vitest";
import { carpoolSavings, modeSwitchSavings, openBurningPm25Grams, weeklyCommuteCo2Kg, wfhDaySavings } from "@/lib/impact/emissions";
import { exerciseDoseMultiplier, modeDoseChangePct, purifierReductionPct, tripDose } from "@/lib/impact/exposure";

describe("emissions", () => {
  it("weekly commute CO2 = factor × km × 2 trips × 5 days", () => {
    expect(weeklyCommuteCo2Kg("car", 10)).toBeCloseTo(0.13 * 10 * 2 * 5);
    expect(weeklyCommuteCo2Kg("cycle", 10)).toBe(0);
  });
  it("mode switch savings, weekly (1 dp) and yearly", () => {
    expect(modeSwitchSavings("car", "metro", 12)).toEqual({ weeklyKg: 13.8, yearlyKg: 718 });
    expect(modeSwitchSavings("metro", "car", 12).weeklyKg).toBeLessThan(0);
  });
  it("carpool halves per-person emissions", () => expect(carpoolSavings(10).weeklyKg).toBe(6.5));
  it("one WFH day saves a fifth of the week", () => expect(wfhDaySavings("car", 10).weeklyKg).toBe(2.6));
  it("open burning PM2.5 (Akagi 6.26 g/kg)", () => expect(openBurningPm25Grams(10)).toBe(63));
});

describe("exposure", () => {
  it("trip dose scales with distance", () => expect(tripDose("bus", 20)).toBeCloseTo(2 * tripDose("bus", 10)));
  it("metro lowers dose vs two-wheeler; zero distance is no change", () => {
    expect(modeDoseChangePct("two_wheeler", "metro", 10)).toBeLessThan(0);
    expect(modeDoseChangePct("car", "car", 10)).toBe(0);
    expect(modeDoseChangePct("car", "metro", 0)).toBe(0);
  });
  it("purifier mass balance", () => {
    expect(purifierReductionPct(250)).toBe(80);
    expect(purifierReductionPct(0)).toBe(0);
    expect(purifierReductionPct(400)).toBeGreaterThan(purifierReductionPct(250));
  });
  it("exercise multiplier uses EPA EFH Table 6-2 (moderate / sedentary)", () => expect(exerciseDoseMultiplier()).toBe(6.2));
});
