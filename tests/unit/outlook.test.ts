import { describe, expect, it } from "vitest";
import { cleanestWindows, extremes, formatWhen, formatWindowWhen, parseForecast, type ForecastHour } from "@/features/outlook/logic";
import fixture from "../fixtures/live/open-meteo-mumbai.json";

const hours = parseForecast(fixture.hourly);
/** Hourly points starting 00:00 IST on 23 Nov 2026 (the local-time clock the model uses). */
const synthetic = (values: Array<number | null>): ForecastHour[] =>
  parseForecast({ time: values.map((_, i) => `2026-11-23T${String(i % 24).padStart(2, "0")}:00`.replace("23T", i < 24 ? "23T" : "24T")), pm2_5: values, pm10: values.map(() => null) });

describe("parseForecast (real Open-Meteo response)", () => {
  it("turns 48 local-time strings into instants and keeps both pollutants", () => {
    expect(hours).toHaveLength(48);
    expect(hours[0]).toMatchObject({ at: "2026-11-23T04:30:00.000Z", pm25: 93.8 }); // 10:00 IST
    expect(hours.every((h) => h.pm25 !== null && h.pm10 !== null)).toBe(true);
  });
  it("keeps nulls as null and skips unparseable times", () => {
    const parsed = parseForecast({ time: ["2026-11-23T10:00", "bad", "2026-11-23T11:00"], pm2_5: [1, 2, null], pm10: [3, 4, 5] });
    expect(parsed).toEqual([{ at: "2026-11-23T04:30:00.000Z", pm25: 1, pm10: 3 }, { at: "2026-11-23T05:30:00.000Z", pm25: null, pm10: 5 }]);
  });
});

describe("cleanestWindows", () => {
  const windows = cleanestWindows(hours);

  it("returns three non-overlapping waking-hour windows ranked cleanest first", () => {
    expect(windows).toHaveLength(3);
    expect(windows.map((w) => w.rank)).toEqual([1, 2, 3]);
    expect(windows.map((w) => w.avgPm25)).toEqual([...windows.map((w) => w.avgPm25)].sort((a, b) => a - b));
    const starts = windows.map((w) => Date.parse(w.start)).sort((a, b) => a - b);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(3 * 3_600_000);
    expect(starts[2]! - starts[1]!).toBeGreaterThanOrEqual(3 * 3_600_000);
    for (const w of windows) {
      const startHour = Number(formatWhen(w.start, "en").slice(-5, -3));
      expect(startHour).toBeGreaterThanOrEqual(6);
      expect(startHour + 3).toBeLessThanOrEqual(22);
      expect(Date.parse(w.end) - Date.parse(w.start)).toBe(3 * 3_600_000);
    }
  });
  it("matches the mean of the hours it covers and assigns a PM2.5-only CPCB category", () => {
    const w = windows[0]!;
    const covered = hours.filter((h) => Date.parse(h.at) >= Date.parse(w.start) && Date.parse(h.at) < Date.parse(w.end));
    expect(covered).toHaveLength(3);
    expect(w.avgPm25).toBeCloseTo(covered.reduce((a, h) => a + h.pm25!, 0) / 3, 1);
    expect(["Moderate", "Poor", "Very Poor", "Satisfactory", "Good", "Severe"]).toContain(w.category);
  });
  it("never picks night hours even when they are cleanest", () => {
    const night = synthetic(Array.from({ length: 24 }, (_, h) => (h >= 1 && h <= 5 ? 5 : 100)));
    const [only] = cleanestWindows(night, 1);
    expect(Number(formatWhen(only!.start, "en").slice(-5, -3))).toBeGreaterThanOrEqual(6);
  });
  it("skips windows with missing values or gaps", () => {
    const values = Array.from({ length: 24 }, () => 100 as number | null);
    values[9] = null;
    values[10] = 10;
    values[11] = 10; // 9-12 contains a null: not eligible despite two very clean hours
    const found = cleanestWindows(synthetic(values), 3);
    expect(found.every((w) => !(Date.parse(w.start) <= Date.parse(synthetic(values)[9]!.at) && Date.parse(w.end) > Date.parse(synthetic(values)[9]!.at)))).toBe(true);
    const gap = [hours[0]!, hours[1]!, hours[3]!, hours[4]!, hours[5]!].map((h) => ({ ...h }));
    expect(cleanestWindows(gap)).toHaveLength(1); // only hours 3-5 are consecutive
  });
  it("breaks ties by the earlier window and returns fewer than requested when there is no room", () => {
    const flat = synthetic(Array.from({ length: 24 }, () => 50));
    const found = cleanestWindows(flat, 3);
    expect(found.map((w) => w.start)).toEqual([...found.map((w) => w.start)].sort());
    expect(cleanestWindows(flat.slice(0, 8), 3).length).toBeLessThan(3);
    expect(cleanestWindows([], 3)).toEqual([]);
    expect(cleanestWindows(synthetic(Array(24).fill(null)))).toEqual([]);
  });
});

describe("extremes and date formatting", () => {
  it("finds the peak and lowest hours, ignoring nulls", () => {
    const e = extremes(hours)!;
    expect(e.peak.pm25).toBe(98.3);
    expect(e.low.pm25).toBe(35.9);
    expect(extremes(synthetic([null, null]))).toBeNull();
  });
  it("formats in India time in both languages", () => {
    expect(formatWhen("2026-11-23T08:30:00Z", "en")).toMatch(/Mon,? 23 Nov,? 14:00/);
    expect(formatWindowWhen({ start: "2026-11-23T08:30:00Z", end: "2026-11-23T11:30:00Z" }, "en")).toMatch(/14:00–17:00$/);
    expect(formatWhen("2026-11-23T08:30:00Z", "hi")).toMatch(/[ऀ-ॿ]/);
  });
});
