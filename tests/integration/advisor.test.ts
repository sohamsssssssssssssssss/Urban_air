import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFacts } from "@/lib/impact/facts";
import { profile, snapshot } from "../fixtures/data";

const generateContent = vi.fn();
let gemini: { models: { generateContent: typeof generateContent } } | null = { models: { generateContent } };
vi.mock("@/lib/ai/client", () => ({ getGemini: () => gemini }));

const facts = buildFacts(snapshot, profile, true);
const item = (factId: string, extra: Record<string, string> = {}) => {
  const f = facts.find((x) => x.id === factId) ?? { action: "Do something", why: "Reason" };
  return { factId, action: `Because you have a child, ${f.action}`, why: f.why, impact: "model-written impact", personalizedFor: "Your child", priority: "high", ...extra };
};
const valid = {
  summary: "AQI 374 (Very Poor) at Anand Vihar, Delhi, measured 22 Nov, 16:30 IST.",
  routines: [item("n95_mask"), item("n95_mask"), item("unknown_fact")],
  indoor: [item("purifier")],
  alternatives: [item("transit_switch"), item("purifier")],
};
const reply = (obj: unknown) => ({ text: JSON.stringify(obj) });

async function advise(language: "en" | "hi" = "en", p = profile) {
  vi.resetModules();
  const { getAdvice } = await import("@/lib/ai/advisor");
  return getAdvice(snapshot, p, language, true);
}

describe("getAdvice", () => {
  beforeEach(() => {
    gemini = { models: { generateContent } };
    generateContent.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("uses Gemini output but substitutes code-computed impact, dropping unknown, duplicate and misplaced facts", async () => {
    generateContent.mockResolvedValueOnce(reply(valid));
    const { advice, generatedBy } = await advise();
    expect(generatedBy).toBe("gemini");
    expect(advice.routines).toHaveLength(1);
    expect(advice.alternatives).toHaveLength(1);
    expect(advice.routines[0]?.impact).toBe(facts.find((f) => f.id === "n95_mask")?.impact);
    expect(advice.bestOutdoorWindow).toMatch(/13:00/);
    const config = generateContent.mock.calls[0]?.[0].config;
    expect(config).toMatchObject({ responseMimeType: "application/json", maxOutputTokens: 2048 });
  });

  it("retries once on invalid JSON, then falls back to rules", async () => {
    generateContent.mockResolvedValue({ text: "not json" });
    const { generatedBy, advice } = await advise();
    expect(generatedBy).toBe("rules");
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(advice.summary).toContain("AQI 374");
  });

  it("rejects output containing numbers not in the grounded context (hallucination guard)", async () => {
    generateContent.mockResolvedValueOnce(reply({ ...valid, summary: "AQI is 999 today." })).mockResolvedValueOnce(reply(valid));
    const { generatedBy } = await advise();
    expect(generatedBy).toBe("gemini");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("rejects output that empties a section that has facts", async () => {
    generateContent.mockResolvedValue(reply({ ...valid, indoor: [] }));
    expect((await advise()).generatedBy).toBe("rules");
  });

  it("falls back to rules when the API throws", async () => {
    generateContent.mockRejectedValue(new Error("quota"));
    expect((await advise()).generatedBy).toBe("rules");
  });

  it("works with zero AI when no key is configured", async () => {
    gemini = null;
    const { generatedBy, advice } = await advise();
    expect(generatedBy).toBe("rules");
    expect(advice.indoor.length).toBeGreaterThan(0);
  });

  it("accepts a Hindi impact translation only when its numbers match the computed fact", async () => {
    const purifierImpact = facts.find((f) => f.id === "purifier")!.impact;
    const pct = /(\d+)%/.exec(purifierImpact)![1];
    const hindi = { ...valid, indoor: [item("purifier", { impact: `कमरे का PM2.5 लगभग ${pct}% कम` })], alternatives: [item("transit_switch", { impact: "हर हफ्ते 99 किलो बचत" })] };
    generateContent.mockResolvedValueOnce(reply(hindi));
    const { advice } = await advise("hi");
    expect(advice.indoor[0]?.impact).toContain("कमरे");
    expect(advice.alternatives[0]?.impact).toBe(facts.find((f) => f.id === "transit_switch")?.impact);
  });

  it("caches advice per reading + profile", async () => {
    vi.resetModules();
    const { getAdvice } = await import("@/lib/ai/advisor");
    generateContent.mockResolvedValue(reply(valid));
    await getAdvice(snapshot, profile, "en", true);
    await getAdvice(snapshot, profile, "en", true);
    await getAdvice(snapshot, { ...profile, pets: true }, "en", true);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
