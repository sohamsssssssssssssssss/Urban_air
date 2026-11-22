import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import { buildFacts } from "@/lib/impact/facts";
import geminiEn from "../fixtures/live/gemini-advice-en.json";
import geminiHi from "../fixtures/live/gemini-advice-hi.json";
import { liveSnapshot, profile } from "../fixtures/data";

const generateContent = vi.fn();
let gemini: { models: { generateContent: typeof generateContent } } | null = { models: { generateContent } };
vi.mock("@/lib/ai/client", () => ({ getGemini: () => gemini }));

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
    generateContent.mockRejectedValue(new Error("quota"));
    const { generatedBy, advice } = await advise("hi");
    expect(generatedBy).toBe("rules");
    expect(advice.summary).toContain("मध्यम");
  });

  it("works with zero AI when no key is configured", async () => {
    gemini = null;
    const { generatedBy, advice } = await advise();
    expect(generatedBy).toBe("rules");
    expect(advice.indoor.length).toBeGreaterThan(0);
  });

  it("caches advice per reading + profile + language", async () => {
    vi.resetModules();
    const { getAdvice } = await import("@/lib/ai/advisor");
    generateContent.mockResolvedValue({ text: geminiEn.text });
    await getAdvice(snapshot, profile, "en", true);
    await getAdvice(snapshot, profile, "en", true);
    await getAdvice(snapshot, { ...profile, pets: true }, "en", true);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
