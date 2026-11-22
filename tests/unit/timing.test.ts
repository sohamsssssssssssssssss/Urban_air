import { describe, expect, it } from "vitest";
import { formatWindow, istHour, timingFromHistory } from "@/lib/impact/timing";
import liveSnapshot from "../fixtures/live/snapshot-delhi.json";

describe("timingFromHistory", () => {
  it("finds the cleanest and dirtiest waking windows in real Delhi data", () => {
    const t = timingFromHistory(liveSnapshot.history);
    expect(t.measured).toBe(true);
    expect(formatWindow(t.best)).toBe("14:00–17:00");
    expect(formatWindow(t.worst!)).toBe("08:00–11:00");
    expect(t.best.avg).toBeLessThan(t.worst!.avg!);
    expect(t.reductionPct).toBe(Math.round((1 - t.best.avg! / t.worst!.avg!) * 100));
  });

  it("falls back to the documented default window without a percentage when history is thin", () => {
    expect(timingFromHistory(undefined)).toEqual({ best: { start: 13, end: 17 }, measured: false });
    expect(timingFromHistory(liveSnapshot.history.slice(0, 5)).measured).toBe(false);
  });

  it("needs complete windows within waking hours", () => {
    const night = Array.from({ length: 14 }, (_, i) => ({ at: new Date(Date.UTC(2026, 10, 22, 17 + i)).toISOString(), pm25: 100 })); // 22:30-11:30 IST, gaps by day
    expect(timingFromHistory(night.filter((_, i) => i % 2 === 0)).measured).toBe(false);
  });

  it("converts UTC to IST hours", () => {
    expect(istHour("2026-11-22T08:30:00Z")).toBe(14);
    expect(istHour("2026-11-22T20:00:00Z")).toBe(1);
  });
});
