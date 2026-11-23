import type { ReactElement, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { todayCard, weeklyCard, type TodayCardData } from "@/features/share/cardElements";
import { toVisualOrder } from "@/features/share/devanagari";

/** All text in an element tree, in order, joined with `|`. */
function texts(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(texts);
  return texts((node as ReactElement<{ children?: ReactNode }>).props.children);
}
const data: TodayCardData = { city: "Mumbai", aqi: 303, category: "Very Poor", window: "12:00–15:00", windowMeasured: true, mask: "n95", station: "Worli, Mumbai", time: "23 Nov, 11:00 IST", source: "OpenAQ" };

describe("todayCard", () => {
  it("draws the computed values: city, AQI, category as text, best time, mask, station and time", () => {
    const t = texts(todayCard(data, "en"));
    expect(t).toEqual(["SmogSense", "Mumbai", "303", "Very Poor", "AQI", "Best time outside: 12:00–15:00", "Wear a close-fitted N95 outdoors", "Worli, Mumbai · 23 Nov, 11:00 IST · OpenAQ"]);
  });
  it("says 'usually' when the window is the default, and covers every mask decision", () => {
    expect(texts(todayCard({ ...data, windowMeasured: false }, "en"))).toContain("Usually best outside: 12:00–15:00");
    expect(texts(todayCard({ ...data, mask: "none" }, "en"))).toContain("No mask needed");
    expect(texts(todayCard({ ...data, mask: "optional" }, "en"))).toContain("Mask optional");
  });
  it("is in Hindi with the short-i sign put in visual order, and unspelled units", () => {
    const t = texts(todayCard(data, "hi"));
    expect(t).toContain(toVisualOrder("बाहर फिट N95 मास्क पहनें"));
    expect(t).toContain("बहुत खराब");
    expect(t.join(" ")).not.toMatch(/[µ³₂]/); // the font has none of these glyphs
  });
});

describe("weeklyCard", () => {
  const week = { period: "week" as const, trips: 5, km: 62.5, co2: 7.2, pm25: 140.4 };
  it("draws the user's totals and says they are self-reported estimates", () => {
    const t = texts(weeklyCard(week, "en"));
    expect(t).toEqual(["SmogSense", "My week with SmogSense", "7.2 kg CO2 avoided", "140.4 micrograms of PM2.5 breathed in less (estimate)", "5 trips · 62.5 km", "Self-reported on this device. Estimates only."]);
  });
  it("words negative savings as extra, and uses the singular for one trip", () => {
    const t = texts(weeklyCard({ ...week, trips: 1, co2: -2.4, pm25: -10 }, "en"));
    expect(t).toContain("2.4 kg CO2 extra");
    expect(t).toContain("10 micrograms of PM2.5 breathed in more (estimate)");
    expect(t).toContain("1 trip · 62.5 km");
  });
  it("has titles for each period and a Hindi version", () => {
    expect(texts(weeklyCard({ ...week, period: "month" }, "en"))).toContain("My month with SmogSense");
    expect(texts(weeklyCard({ ...week, period: "all" }, "en"))).toContain("My impact with SmogSense");
    expect(texts(weeklyCard(week, "hi")).join(" ")).toContain(toVisualOrder("इसी डिवाइस पर खुद दर्ज किया गया। केवल अनुमान।"));
  });
});
