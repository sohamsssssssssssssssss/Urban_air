import type { CompareSide } from "@/features/compare/server";

export const okSide = (over: Partial<Extract<CompareSide, { status: "ok" }>> = {}): CompareSide => ({
  status: "ok", label: "Mumbai", aqi: 120, category: "Moderate", dominant: "pm25", station: "Worli, Mumbai - MPCB", source: "OpenAQ",
  measuredAt: "2026-11-23T05:00:00Z", stale: false, bestWindow: "14:00–17:00", windowMeasured: true, ...over,
});
