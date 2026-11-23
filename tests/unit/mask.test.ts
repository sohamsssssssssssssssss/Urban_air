import { describe, expect, it } from "vitest";
import { MASK_SOURCE } from "@/features/mask/constants";
import { maskFor, type MaskInput } from "@/features/mask/logic";

const input = (over: Partial<MaskInput> = {}): MaskInput => ({ aqi: 150, activity: "commute", sensitive: false, child: false, ...over });

describe("maskFor (MoHFW 2024: N95/N99 when AQI > 200; paper/cloth ineffective)", () => {
  it.each([
    [0, "none"], [100, "none"], [200, "none"], [201, "n95"], [300, "n95"], [500, "n95"],
  ] as const)("commute at AQI %i, not sensitive -> %s", (aqi, level) => expect(maskFor(input({ aqi })).level).toBe(level));

  it("makes a mask optional for sensitive people from the Moderate band (101-200)", () => {
    expect(maskFor(input({ aqi: 100, sensitive: true })).level).toBe("none");
    expect(maskFor(input({ aqi: 101, sensitive: true })).level).toBe("optional");
    expect(maskFor(input({ aqi: 200, sensitive: true })).level).toBe("optional");
    expect(maskFor(input({ aqi: 201, sensitive: true })).level).toBe("n95");
  });

  it("needs no mask indoors at any AQI", () => {
    for (const aqi of [50, 250, 450]) expect(maskFor(input({ aqi, activity: "indoors" })).level).toBe("none");
  });

  it("advises avoiding outdoor exertion from Poor air (everyone) and from Moderate air (sensitive)", () => {
    expect(maskFor(input({ aqi: 201, activity: "exertion" }))).toMatchObject({ level: "n95", avoidExertion: true });
    expect(maskFor(input({ aqi: 150, activity: "exertion" })).avoidExertion).toBe(false);
    expect(maskFor(input({ aqi: 150, activity: "exertion", sensitive: true })).avoidExertion).toBe(true);
    expect(maskFor(input({ aqi: 201, activity: "commute" })).avoidExertion).toBe(false);
  });

  it("shows the children note only when a child is present and a mask is being advised", () => {
    expect(maskFor(input({ aqi: 250, child: true })).childNote).toBe(true);
    expect(maskFor(input({ aqi: 150, sensitive: true, child: true })).childNote).toBe(true);
    expect(maskFor(input({ aqi: 50, child: true })).childNote).toBe(false);
    expect(maskFor(input({ aqi: 250, child: false })).childNote).toBe(false);
  });

  it("rejects an AQI outside 0-500", () => {
    for (const aqi of [501, -1, Number.NaN, Infinity]) expect(() => maskFor(input({ aqi }))).toThrow(RangeError);
    expect(() => maskFor(input({ aqi: 0 }))).not.toThrow();
    expect(() => maskFor(input({ aqi: 500 }))).not.toThrow();
  });

  it("cites a government source with a URL", () => {
    expect(MASK_SOURCE).toMatchObject({ date: "18 November 2024", url: expect.stringContaining("ncdc.mohfw.gov.in") });
  });
});
