import { describe, expect, it } from "vitest";
import { aqiFromSubIndices, categoryFor, computeAqi, subIndex, subIndicesFor } from "@/lib/aq/naqi";
import type { Pollutant } from "@/lib/aq/types";

describe("categoryFor", () => {
  it.each([
    [0, "Good"], [50, "Good"], [51, "Satisfactory"], [100, "Satisfactory"], [101, "Moderate"], [200, "Moderate"],
    [201, "Poor"], [300, "Poor"], [301, "Very Poor"], [400, "Very Poor"], [401, "Severe"], [500, "Severe"], [999, "Severe"],
  ])("AQI %i -> %s", (aqi, category) => expect(categoryFor(aqi)).toBe(category));
});

describe("subIndex at every CPCB breakpoint edge", () => {
  // Concentration at the top of each band maps exactly to the band's upper index.
  const edges: Record<Pollutant, number[]> = {
    pm25: [30, 60, 90, 120, 250],
    pm10: [50, 100, 250, 350, 430],
    no2: [40, 80, 180, 280, 400],
    o3: [50, 100, 168, 208, 748],
    co: [1000, 2000, 10000, 17000, 34000], // µg/m³ in, mg/m³ breakpoints
    so2: [40, 80, 380, 800, 1600],
  };
  const upper = [50, 100, 200, 300, 400];
  for (const [p, cs] of Object.entries(edges) as Array<[Pollutant, number[]]>) {
    it(`${p} band tops`, () => cs.forEach((c, i) => expect(subIndex(p, c)).toBe(upper[i])));
  }

  it("crossing an edge moves to the next category", () => {
    expect(categoryFor(subIndex("pm25", 30))).toBe("Good");
    expect(categoryFor(subIndex("pm25", 31))).toBe("Satisfactory");
    expect(categoryFor(subIndex("pm25", 251))).toBe("Severe");
    expect(categoryFor(subIndex("pm10", 101))).toBe("Moderate");
  });

  it("interpolates linearly inside a band", () => expect(subIndex("pm25", 15)).toBe(25));
  it("returns 0 for zero/negative and caps at 500", () => {
    expect(subIndex("pm25", 0)).toBe(0);
    expect(subIndex("pm25", -5)).toBe(0);
    expect(subIndex("pm25", 380)).toBe(500);
    expect(subIndex("pm25", 2000)).toBe(500);
  });
});

describe("computeAqi", () => {
  it("is the max sub-index and reports the dominant pollutant", () => {
    expect(computeAqi({ pm25: 182, pm10: 120, no2: 30 })).toEqual({ aqi: subIndex("pm25", 182), category: "Very Poor", dominant: "pm25" });
    expect(computeAqi({ pm25: 20, pm10: 300 })?.dominant).toBe("pm10");
  });
  it("requires a particulate reading", () => expect(computeAqi({ no2: 500, o3: 80 })).toBeNull());
});

describe("sub-index helpers", () => {
  it("computes sub-indices for measured pollutants only", () => expect(subIndicesFor({ pm25: 60, no2: 80 })).toEqual({ pm25: 100, no2: 100 }));
  it("takes AQI from published sub-indices (CPCB) and requires PM", () => {
    expect(aqiFromSubIndices({ pm25: 222, pm10: 135, co: 12 })).toEqual({ aqi: 222, category: "Poor", dominant: "pm25" });
    expect(aqiFromSubIndices({ co: 300 })).toBeNull();
  });
});
