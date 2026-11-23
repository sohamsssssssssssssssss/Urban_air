import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import { buildFacts } from "@/lib/impact/facts";
import geminiEn from "../fixtures/live/gemini-advice-en.json";
import geminiHi from "../fixtures/live/gemini-advice-hi.json";
import { liveSnapshot, profile } from "../fixtures/data";

const generateContent = vi.fn();
let gemini: { models: { generateContent: typeof generateContent } } | null = { models: { generateContent } };
vi.mock("@/lib/ai/client", async (original) => ({ ...(await original<typeof import("@/lib/ai/client")>()), getGemini: () => gemini }));

// The real snapshot and real Gemini responses were captured together, so the model's numbers are grounded in it.
const snapshot = liveSnapshot as AQSnapshot;
const realEn = JSON.parse(geminiEn.text);
const reply = (obj: unknown) => ({ text: typeof obj === "string" ? obj : JSON.stringify(obj) });

async function advise(language: "en" | "hi" = "en") {
  vi.resetModules();
  const { getAdvice } = await import("@/lib/ai/advisor");
  return getAdvice(snapshot, profile, language, true);
}

describe("getAdvice", () => {
  beforeEach(() => {
    gemini = { models: { generateContent } };
    generateContent.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it.each([["en", geminiEn], ["hi", geminiHi]] as const)("accepts the real Gemini %s response, with impact replaced by computed facts", async (lang, fixture) => {
    generateContent.mockResolvedValueOnce({ text: fixture.text });
    const { advice, generatedBy } = await advise(lang);
    expect(generatedBy).toBe("gemini");
    const facts = new Set(buildFacts(snapshot, profile, true, lang).map((f) => f.impact));
    for (const item of [...advice.routines, ...advice.indoor, ...advice.alternatives]) expect(facts.has(item.impact)).toBe(true);
    expect(advice.summary).toContain("195");
    expect(advice.bestOutdoorWindow).toMatch(/^14:00–17:00/);
    const config = generateContent.mock.calls[0]?.[0].config;
    expect(config).toMatchObject({ responseMimeType: "application/json", maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } });
    expect(config.responseJsonSchema).not.toHaveProperty("$schema");
  });

  it("drops unknown, duplicate and misplaced fact references", async () => {
    const first = realEn.routines[0];
    generateContent.mockResolvedValueOnce(reply({ ...realEn, routines: [first, first, { ...first, factId: "made_up" }], alternatives: [...realEn.alternatives, realEn.indoor[0]] }));
    const { advice } = await advise();
    expect(advice.routines).toHaveLength(1);
    expect(advice.alternatives).toHaveLength(realEn.alternatives.length);
  });

  it("retries once on invalid JSON, then falls back to rules", async () => {
    generateContent.mockResolvedValue(reply("not json"));
    const { generatedBy, advice } = await advise();
    expect(generatedBy).toBe("rules");
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(advice.summary).toContain("AQI 195");
  });

  it("rejects output containing numbers not in the grounded context (hallucination guard)", async () => {
    generateContent.mockResolvedValueOnce(reply({ ...realEn, summary: "AQI is 999 today." })).mockResolvedValueOnce({ text: geminiEn.text });
    const { generatedBy } = await advise();
    expect(generatedBy).toBe("gemini");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("rejects output that empties a section that has facts", async () => {
    generateContent.mockResolvedValue(reply({ ...realEn, indoor: [] }));
    expect((await advise()).generatedBy).toBe("rules");
  });

  it("falls back to rules when the API throws, in the requested language", async () => {
    generateContent.mockRejectedValue(new Error("network down"));
    const { generatedBy, advice } = await advise("hi");
    expect(generatedBy).toBe("rules");
    expect(advice.summary).toContain("मध्यम");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("works with zero AI when no key is configured", async () => {
    gemini = null;
    const { generatedBy, advice } = await advise();
    expect(generatedBy).toBe("rules");
    expect(advice.indoor.length).toBeGreaterThan(0);
  });

  it("caches model calls across readings in the same NAQI band without returning stale facts", async () => {
    vi.resetModules();
    const { getAdvice } = await import("@/lib/ai/advisor");
    generateContent.mockResolvedValue({ text: geminiEn.text });
    await getAdvice(snapshot, profile, "en", true);
    await getAdvice(snapshot, profile, "en", true);
    const updated = await getAdvice({ ...snapshot, aqi: 199, measuredAt: "2026-11-22T13:30:00Z" }, profile, "en", true);
    expect(updated.generatedBy).toBe("rules");
    expect(updated.advice.summary).toContain("AQI 199");
    expect(generateContent).toHaveBeenCalledTimes(1);
    await getAdvice({ ...snapshot, aqi: 201, category: "Poor" }, profile, "en", true);
    await getAdvice(snapshot, { ...profile, pets: true }, "en", true);
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  describe("Today in one line (Gemini rewording)", () => {
    const target = { line: "Today the best time outside is 14:00–17:00. Keep windows shut. Wear a close-fitted N95 when you go out.", mustMention: [["14:00"], ["17:00"], ["shut", "closed"], ["mask", "N95"]] };
    const withLine = (todayLine: string) => ({ text: JSON.stringify({ ...realEn, todayLine }) });
    const advise2 = async (rephrase?: typeof target) => {
      vi.resetModules();
      const { getAdvice } = await import("@/lib/ai/advisor");
      return getAdvice(snapshot, profile, "en", true, rephrase);
    };

    it("returns Gemini's wording when it keeps the times and decisions, in the same single call", async () => {
      const good = "Go out between 14:00–17:00, keep windows shut, and wear an N95 mask.";
      generateContent.mockResolvedValueOnce(withLine(good));
      const r = await advise2(target);
      expect(r).toMatchObject({ generatedBy: "gemini", todayLine: good });
      expect(generateContent).toHaveBeenCalledTimes(1);
      const call = generateContent.mock.calls[0]![0];
      expect(call.config.systemInstruction).toContain('"todayLine"');
      expect(call.contents).toContain(target.line); // the computed sentence is in the grounded context
    });
    it("drops a rewording that omits the mask but still returns the advice", async () => {
      generateContent.mockResolvedValueOnce(withLine("Go out between 14:00–17:00 and keep windows shut."));
      const r = await advise2(target);
      expect(r.generatedBy).toBe("gemini");
      expect(r.todayLine).toBeUndefined();
    });
    it("does not ask for a todayLine when no target is given", async () => {
      generateContent.mockResolvedValueOnce({ text: geminiEn.text });
      const r = await advise2();
      expect(generateContent.mock.calls[0]![0].config.systemInstruction).not.toContain('"todayLine"');
      expect(r.todayLine).toBeUndefined();
    });
    it("caches the accepted wording with the advice", async () => {
      const good = "Go out between 14:00–17:00, keep windows shut, and wear an N95 mask.";
      generateContent.mockResolvedValue(withLine(good));
      vi.resetModules();
      const { getAdvice } = await import("@/lib/ai/advisor");
      await getAdvice(snapshot, profile, "en", true, target);
      expect((await getAdvice(snapshot, profile, "en", true, target)).todayLine).toBe(good);
      expect(generateContent).toHaveBeenCalledTimes(1);
    });
  });
});
