import { describe, expect, it } from "vitest";
import { asPollutant, toUgM3 } from "@/lib/aq/units";

describe("asPollutant", () => {
  it.each([["PM2.5", "pm25"], ["pm10", "pm10"], ["OZONE", "o3"], ["NO2", "no2"], ["NH3", undefined], ["temperature", undefined]])("%s", (input, out) =>
    expect(asPollutant(input)).toBe(out),
  );
});

describe("toUgM3", () => {
  it("passes µg/m³ through and converts mg/m³", () => {
    expect(toUgM3("pm25", 55, "µg/m³")).toBe(55);
    expect(toUgM3("co", 1.2, "mg/m³")).toBe(1200);
  });
  it("converts gas ppm/ppb at 25 °C", () => {
    expect(toUgM3("no2", 1, "ppm")).toBeCloseTo(1881.8, 0);
    expect(toUgM3("o3", 50, "ppb")).toBeCloseTo(98.2, 0);
  });
  it("rejects unknown units, PM in ppm, and invalid values", () => {
    expect(toUgM3("pm25", 10, "ppm")).toBeUndefined();
    expect(toUgM3("no2", 10, "furlongs")).toBeUndefined();
    expect(toUgM3("no2", -1, "ppm")).toBeUndefined();
    expect(toUgM3("no2", Number.NaN, "ppm")).toBeUndefined();
  });
});
