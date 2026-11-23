import { describe, expect, it } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import { COMMUTE_MODES } from "@/lib/commute";
import { TONES } from "@/lib/impact/copy/types";
import { FACT_IDS } from "@/lib/impact/factIds";
import { buildFacts } from "@/lib/impact/facts";
import { liveSnapshot, profile, snapshot } from "../fixtures/data";

describe("FACT_IDS (the closed list the feedback API accepts)", () => {
  it("is exactly the set of tip ids buildFacts can produce: nothing missing, nothing unreachable", () => {
    const produced = new Set<string>();
    const readings: AQSnapshot[] = [60, 150, 250, 374].flatMap((aqi) => [{ ...snapshot, aqi }, { ...(liveSnapshot as AQSnapshot), aqi }]);
    for (const s of readings) {
      for (const commuteMode of COMMUTE_MODES) {
        for (const commuteKm of [0, 3, 12]) {
          for (const household of [{ kids: false, elderly: false, respiratory: false, pets: false }, { kids: true, elderly: true, respiratory: true, pets: true }]) {
            for (const budget of ["low", "high"] as const) {
              for (const hasMetro of [true, false]) {
                for (const tone of TONES) {
                  const p = { ...profile, ...household, commuteMode, commuteKm, budget, ownsPurifier: budget === "high", workStartHour: 9 };
                  for (const f of buildFacts(s, p, hasMetro, "en", tone)) produced.add(f.id);
                }
              }
            }
          }
        }
      }
    }
    expect([...produced].sort()).toEqual([...FACT_IDS].sort());
  });
  it("has no duplicates and only safe characters", () => {
    expect(new Set(FACT_IDS).size).toBe(FACT_IDS.length);
    for (const id of FACT_IDS) expect(id).toMatch(/^[a-z0-9_]{3,40}$/);
  });
});
