import { describe, expect, it } from "vitest";
import { acceptRephrase } from "@/lib/ai/rephrase";
import { extractNumbers } from "@/lib/ai/grounding";
import type { AQSnapshot } from "@/lib/aq/types";
import { TodayFactsSchema, todayFacts, todaySentence, todayTarget } from "@/features/today/logic";
import { liveSnapshot, profile, snapshot } from "../fixtures/data";

const live = liveSnapshot as AQSnapshot;
const at = (aqi: number): AQSnapshot => ({ ...live, aqi });
const calm = { ...profile, kids: false, elderly: false, respiratory: false };

describe("todayFacts", () => {
  it("uses the station's measured cleanest window when hourly history exists", () => {
    expect(todayFacts(live, calm)).toMatchObject({ window: "14:00–17:00", measured: true });
  });
  it("falls back to the documented afternoon window without history", () => {
    expect(todayFacts(snapshot, calm)).toMatchObject({ window: "13:00–17:00", measured: false });
  });
  it.each([[50, "open"], [100, "open"], [101, "limited"], [200, "limited"], [201, "closed"], [400, "closed"]] as const)("AQI %i -> windows %s", (aqi, windows) => {
    expect(todayFacts(at(aqi), calm).windows).toBe(windows);
  });
  it("derives the mask decision from the shared mask table and the household", () => {
    expect(todayFacts(at(250), calm).mask).toBe("n95");
    expect(todayFacts(at(150), calm).mask).toBe("none");
    expect(todayFacts(at(150), { ...calm, kids: true }).mask).toBe("optional");
    expect(todayFacts(at(150), { ...calm, respiratory: true }).mask).toBe("optional");
  });
  it("validates its own output shape", () => expect(TodayFactsSchema.safeParse(todayFacts(live, calm)).success).toBe(true));
});

describe("todaySentence", () => {
  const dirty = todayFacts(at(250), calm);
  it("states the window, the windows decision and the mask decision in one plain sentence", () => {
    expect(todaySentence(dirty, "en")).toBe("Today the best time outside is 14:00–17:00. Keep windows shut and air out for only 10–15 minutes during 14:00–17:00. Wear a close-fitted N95 when you go out.");
    expect(todaySentence(todayFacts(at(60), calm), "en")).toBe("Today the best time outside is 14:00–17:00. Windows can stay open. No mask needed.");
    expect(todaySentence(todayFacts(snapshot, calm), "en")).toContain("usually best 13:00–17:00");
  });
  it("carries identical numbers in Hindi", () => {
    for (const aqi of [60, 150, 250]) {
      const f = todayFacts(at(aqi), { ...calm, kids: true });
      expect(extractNumbers(todaySentence(f, "hi")).sort()).toEqual(extractNumbers(todaySentence(f, "en")).sort());
      expect(todaySentence(f, "hi")).toMatch(/[ऀ-ॿ]/);
    }
  });
});

describe("todayTarget + acceptRephrase (Gemini may reword, never drop a decision)", () => {
  const target = todayTarget(todayFacts(at(250), calm), "en");
  const context = JSON.stringify({ todayLine: target.line });
  const good = "Head out between 14:00 and 17:00? Use 14:00–17:00, keep your windows closed except for 10–15 minutes, and wear an N95 mask.";

  it("requires both window times, the shut-windows instruction and the mask when they apply", () => {
    expect(target.mustMention).toEqual([["14:00"], ["17:00"], ["shut", "closed", "close", "बंद"], ["mask", "N95", "मास्क"]]);
    expect(acceptRephrase(good, target, context)).toBe(good);
  });
  it.each([
    ["drops the mask", "Best outside 14:00–17:00 with windows closed, 10–15 minutes."],
    ["drops the windows", "Best outside 14:00–17:00. Wear an N95 mask."],
    ["drops a time", "Best outside after 14:00, windows closed 10–15 minutes, N95 mask."],
    ["invents a number", "Best outside 14:00–17:00, windows closed 10–15 minutes, N95 mask, AQI 450."],
    ["is empty", "   "],
    ["is too long", `${good} ${"x".repeat(240)}`],
  ])("rejects a rewording that %s", (_, candidate) => expect(acceptRephrase(candidate, target, context)).toBeUndefined());
  it("rejects undefined", () => expect(acceptRephrase(undefined, target, context)).toBeUndefined());
  it("only requires what the decisions need (no mask / windows open)", () => {
    const easy = todayTarget(todayFacts(at(60), calm), "en");
    expect(easy.mustMention).toEqual([["14:00"], ["17:00"]]);
    expect(acceptRephrase("Anytime is fine; 14:00 to 17:00 is cleanest (17:00).", easy, JSON.stringify({ todayLine: easy.line }))).toBeDefined();
  });
});
