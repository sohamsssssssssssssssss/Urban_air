import { describe, expect, it } from "vitest";
import { extractNumbers } from "@/lib/ai/grounding";
import { compareSummary, defaultChoices, placeFromChoice } from "@/features/compare/logic";
import { StoredChoicesSchema } from "@/features/compare/schema";
import { okSide } from "../fixtures/compare";

const mumbai = okSide({ label: "Mumbai", aqi: 120 });
const delhi = okSide({ label: "Delhi", aqi: 330, category: "Very Poor" });

describe("compareSummary", () => {
  it("names the cleaner place and the AQI gap, whichever side it is", () => {
    const text = "Mumbai has cleaner air right now: AQI 120 against 330 in Delhi (210 points lower).";
    expect(compareSummary(mumbai, delhi, "en")).toBe(text);
    expect(compareSummary(delhi, mumbai, "en")).toBe(text);
  });
  it("calls readings similar when they differ by less than 10 points", () => {
    expect(compareSummary(okSide({ label: "A", aqi: 100 }), okSide({ label: "B", aqi: 109 }), "en")).toBe("Air quality is similar in both places: AQI 100 in A and 109 in B.");
    expect(compareSummary(okSide({ label: "A", aqi: 100 }), okSide({ label: "B", aqi: 110 }), "en")).toContain("cleaner air");
    expect(compareSummary(mumbai, okSide({ label: "Pune", aqi: 120 }), "en")).toContain("similar");
  });
  it("has no summary unless both sides have live data", () => {
    const down = { status: "unavailable", label: "X", code: "AQ_UNAVAILABLE" } as const;
    expect(compareSummary(mumbai, down, "en")).toBeUndefined();
    expect(compareSummary(down, down, "en")).toBeUndefined();
  });
  it("carries identical numbers in Hindi", () => {
    for (const [a, b] of [[mumbai, delhi], [mumbai, okSide({ label: "Pune", aqi: 125 })]] as const) {
      expect(extractNumbers(compareSummary(a, b, "hi")!).sort()).toEqual(extractNumbers(compareSummary(a, b, "en")!).sort());
      expect(compareSummary(a, b, "hi")).toMatch(/[ऀ-ॿ]/);
    }
  });
});

describe("place choices", () => {
  it("turns a city into coordinates plus the city (for the CPCB fallback) and text into a trimmed query", () => {
    expect(placeFromChoice({ kind: "city", city: "Mumbai" })).toEqual({ lat: 19.076, lon: 72.8777, city: "Mumbai" });
    expect(placeFromChoice({ kind: "text", query: "  Powai, Mumbai " })).toEqual({ query: "Powai, Mumbai" });
  });
  it("starts with the user's city and a different second city", () => {
    expect(defaultChoices("Patna")).toEqual({ a: { kind: "city", city: "Patna" }, b: { kind: "city", city: "Delhi" } });
    expect(defaultChoices("Delhi").b).toEqual({ kind: "city", city: "Noida" });
    expect(defaultChoices(undefined).a).toEqual({ kind: "city", city: "Delhi" });
  });
  it("validates what is stored on the device", () => {
    expect(StoredChoicesSchema.safeParse(defaultChoices("Pune")).success).toBe(true);
    expect(StoredChoicesSchema.safeParse({ a: { kind: "city", city: "Atlantis" }, b: { kind: "text", query: "x" } }).success).toBe(false);
    expect(StoredChoicesSchema.safeParse({ a: { kind: "text", query: "x".repeat(201) }, b: { kind: "text", query: "" } }).success).toBe(false);
  });
});
