import { describe, expect, it } from "vitest";
import { extractNumbers } from "@/lib/ai/grounding";
import type { AQSnapshot } from "@/lib/aq/types";
import { ChecklistStateSchema, buildChecklist, tickedToday, toggleItem } from "@/features/checklist/logic";
import { profile, snapshot } from "../fixtures/data";

const at = (aqi: number): AQSnapshot => ({ ...snapshot, aqi });
const NOW = Date.parse("2026-11-22T06:00:00Z"); // 11:30 IST on 22 Nov
const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("buildChecklist", () => {
  it("lists the indoor actions with Why and the computed Impact when air is Very Poor", () => {
    const items = buildChecklist(at(374), profile, "en");
    expect(ids(items).sort()).toEqual(["cooking_exhaust", "no_indoor_smoke", "purifier", "ventilation_timing"]);
    for (const i of items) expect([i.action, i.why, i.impact].every((t) => t.length > 10)).toBe(true);
    expect(items.find((i) => i.id === "no_indoor_smoke")!.impact).toContain("cigarettes");
  });
  it("lists incense/coils only when AQI is above 200", () => {
    expect(ids(buildChecklist(at(200), profile, "en"))).not.toContain("no_indoor_smoke");
    expect(ids(buildChecklist(at(201), profile, "en"))).toContain("no_indoor_smoke");
  });
  it("never lists the plants fact (it is not a task)", () => expect(ids(buildChecklist(at(374), profile, "en"))).not.toContain("plants_reality"));
  it("adds a filter check for purifier owners, reusing the purifier's computed effect", () => {
    const owner = buildChecklist(at(374), { ...profile, ownsPurifier: true }, "en");
    const filter = owner.find((i) => i.id === "filter_check")!;
    expect(filter.action).toContain("filter");
    expect(filter.impact).toBe(owner.find((i) => i.id === "purifier")!.impact);
    expect(ids(buildChecklist(at(374), { ...profile, ownsPurifier: false }, "en"))).not.toContain("filter_check");
  });
  it("sorts high priority first", () => {
    const order = { high: 0, medium: 1, low: 2 };
    const ranks = buildChecklist(at(374), { ...profile, kids: true, ownsPurifier: true }, "en").map((i) => order[i.priority]);
    expect(ranks).toEqual([...ranks].sort());
  });
  it("carries identical numbers and Hindi text in both languages", () => {
    const en = buildChecklist(at(374), { ...profile, ownsPurifier: true }, "en");
    const hi = buildChecklist(at(374), { ...profile, ownsPurifier: true }, "hi");
    expect(ids(hi)).toEqual(ids(en));
    hi.forEach((item, i) => {
      expect(extractNumbers(item.impact).sort()).toEqual(extractNumbers(en[i]!.impact).sort());
      expect(item.action).toMatch(/[ऀ-ॿ]/);
    });
  });
});

describe("tickedToday / toggleItem (daily reset)", () => {
  const items = buildChecklist(at(374), profile, "en");
  const first = items[0]!.id;
  const today = { day: "2026-11-22", checked: [first] };

  it("keeps today's ticks and drops other days' and unknown items", () => {
    expect(tickedToday(today, items, NOW)).toEqual([first]);
    expect(tickedToday({ day: "2026-11-21", checked: [first] }, items, NOW)).toEqual([]);
    expect(tickedToday({ day: "2026-11-22", checked: [first, "gone"] }, items, NOW)).toEqual([first]);
  });
  it("resets at midnight India time", () => {
    expect(tickedToday(today, items, Date.parse("2026-11-22T18:29:00Z"))).toEqual([first]);
    expect(tickedToday(today, items, Date.parse("2026-11-22T18:31:00Z"))).toEqual([]);
  });
  it("toggles an item on and off and stamps today's date", () => {
    const on = toggleItem({ day: "2026-11-21", checked: ["old"] }, items, first, NOW);
    expect(on).toEqual({ day: "2026-11-22", checked: [first] });
    expect(toggleItem(on, items, first, NOW).checked).toEqual([]);
  });
  it("validates stored state", () => {
    expect(ChecklistStateSchema.safeParse(today).success).toBe(true);
    expect(ChecklistStateSchema.safeParse({ day: "yesterday", checked: [] }).success).toBe(false);
    expect(ChecklistStateSchema.safeParse({ day: "2026-11-22", checked: Array(21).fill("x") }).success).toBe(false);
  });
});
