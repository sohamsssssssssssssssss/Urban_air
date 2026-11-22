import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import geminiEn from "../fixtures/live/gemini-advice-en.json";
import { liveSnapshot, profile } from "../fixtures/data";

const generateContent = vi.fn();
const generateContentStream = vi.fn();
let gemini: unknown = { models: { generateContent, generateContentStream } };
const env = vi.hoisted(() => ({ GEMINI_MODEL: undefined as string | undefined }));
vi.mock("@/lib/env", () => ({ env }));
vi.mock("@/lib/ai/client", async (original) => ({ ...(await original<typeof import("@/lib/ai/client")>()), getGemini: () => gemini }));

const snapshot = liveSnapshot as AQSnapshot;
const ok = { text: geminiEn.text };
const retired = { status: 404, message: "models/gemini-2.5-flash-lite is no longer available to new users" };
const modelsCalled = () => generateContent.mock.calls.map((c) => c[0].model);

async function advise() {
  vi.resetModules();
  const { getAdvice } = await import("@/lib/ai/advisor");
  return { getAdvice, first: await getAdvice(snapshot, profile, "en", true) };
}

describe("advice model failover and reason codes", () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    gemini = { models: { generateContent, generateContentStream } };
    env.GEMINI_MODEL = undefined;
    generateContent.mockReset();
    generateContentStream.mockReset();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("fails over from a retired model (404) to the next and still returns an AI plan", async () => {
    generateContent.mockRejectedValueOnce(retired).mockResolvedValueOnce(ok);
    const { first } = await advise();
    expect(first.generatedBy).toBe("gemini");
    expect(first.fallbackReason).toBeUndefined();
    expect(modelsCalled()).toEqual(["gemini-2.5-flash", "gemini-3.5-flash-lite"]);
    expect(warn).toHaveBeenCalledWith("AI advice failed reason=model model=gemini-2.5-flash");
    // Gemini 3 models reject thinkingBudget (HTTP 400): it is only sent to the 2.5 family.
    expect(generateContent.mock.calls[0]?.[0].config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(generateContent.mock.calls[1]?.[0].config).not.toHaveProperty("thinkingConfig");
  });

  it("GEMINI_MODEL overrides the first model without duplicating it", async () => {
    env.GEMINI_MODEL = "gemini-2.5-flash";
    generateContent.mockResolvedValue(ok);
    await advise();
    expect(modelsCalled()).toEqual(["gemini-2.5-flash"]);
  });

  it.each([
    ["model", retired, 2],
    ["quota", { status: 429, message: "RESOURCE_EXHAUSTED" }, 2],
    ["auth", { status: 403, message: "API key not valid" }, 1],
    ["timeout", Object.assign(new Error("aborted"), { name: "AbortError" }), 1],
    ["other", new Error("socket closed"), 1],
  ])("falls back to rules with reason %s after %i model call(s)", async (reason, error, calls) => {
    generateContent.mockRejectedValue(error);
    const { first } = await advise();
    expect(first).toMatchObject({ generatedBy: "rules", fallbackReason: reason });
    expect(generateContent).toHaveBeenCalledTimes(calls);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(`reason=${reason}`));
    expect(JSON.stringify(warn.mock.calls)).not.toContain("socket closed"); // reason code only, never the provider message
  });

  it("reports schema when output fails validation twice, retrying on the same model only", async () => {
    generateContent.mockResolvedValue({ text: "not json" });
    const { first } = await advise();
    expect(first).toMatchObject({ generatedBy: "rules", fallbackReason: "schema" });
    expect(modelsCalled()).toEqual(["gemini-2.5-flash", "gemini-2.5-flash"]);
  });

  it("reports auth when no key is configured, without any model call", async () => {
    gemini = null;
    expect((await advise()).first).toMatchObject({ generatedBy: "rules", fallbackReason: "auth" });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("does not hammer Gemini during a failure cooldown, then retries and recovers", async () => {
    generateContent.mockRejectedValue({ status: 429 });
    const { getAdvice, first } = await advise();
    expect(first.fallbackReason).toBe("quota");
    const calls = generateContent.mock.calls.length;
    expect((await getAdvice(snapshot, profile, "en", true)).fallbackReason).toBe("quota");
    expect(generateContent).toHaveBeenCalledTimes(calls); // served from the cooldown

    vi.setSystemTime(Date.now() + 61_000);
    generateContent.mockReset().mockResolvedValue(ok);
    expect((await getAdvice(snapshot, profile, "en", true)).generatedBy).toBe("gemini");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("shares one model call between concurrent identical requests", async () => {
    generateContent.mockResolvedValue(ok);
    vi.resetModules();
    const { getAdvice } = await import("@/lib/ai/advisor");
    await Promise.all([getAdvice(snapshot, profile, "en", true), getAdvice(snapshot, profile, "en", true)]);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});

describe("chat model failover", () => {
  beforeEach(() => {
    gemini = { models: { generateContent, generateContentStream } };
    env.GEMINI_MODEL = undefined;
    generateContentStream.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  const input = { snapshot, profile, hasMetro: true, language: "en" as const, message: "Is it safe to run?", history: [] };
  async function* words(...w: string[]) { for (const text of w) yield { text }; }

  it("streams from the next model when the first is retired, with no fallback notice", async () => {
    generateContentStream.mockRejectedValueOnce(retired).mockResolvedValueOnce(words("Better ", "after 14:00."));
    const { streamChat } = await import("@/lib/ai/chat");
    expect(await new Response(await streamChat(input)).text()).toBe("Better after 14:00.");
    expect(generateContentStream.mock.calls.map((c) => c[0].model)).toEqual(["gemini-2.5-flash", "gemini-3.5-flash-lite"]);
    expect(generateContentStream.mock.calls[1]?.[0].config).not.toHaveProperty("thinkingConfig");
  });

  it("names the reason in the grounded fallback when every model fails", async () => {
    generateContentStream.mockRejectedValue(retired);
    const { streamChat } = await import("@/lib/ai/chat");
    const text = await new Response(await streamChat(input)).text();
    expect(text).toContain("AI model unavailable. Showing data-based guidance.");
    expect(generateContentStream).toHaveBeenCalledTimes(2);
  });

  it("never switches models once text has been streamed", async () => {
    async function* broken() { yield { text: "Partial" }; throw { status: 429 }; }
    generateContentStream.mockResolvedValue(broken());
    const { streamChat } = await import("@/lib/ai/chat");
    expect(await new Response(await streamChat(input)).text()).toMatch(/^Partial\n\nAI busy \(quota\)\./);
    expect(generateContentStream).toHaveBeenCalledTimes(1);
  });
});
