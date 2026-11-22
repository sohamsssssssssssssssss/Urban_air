import { describe, expect, it, vi } from "vitest";

const ctor = vi.fn();
vi.mock("@google/genai", () => ({ GoogleGenAI: class { constructor(opts: unknown) { ctor(opts); } } }));
const env: Record<string, string | undefined> = {};
vi.mock("@/lib/env", () => ({ env }));

async function load() {
  vi.resetModules();
  return (await import("@/lib/ai/client")).getGemini;
}

describe("getGemini", () => {
  it("pins API v1beta (JSON mode is rejected on v1) and memoises the client", async () => {
    env.GEMINI_API_KEY = "test-key-123";
    const getGemini = await load();
    expect(getGemini()).toBe(getGemini());
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor).toHaveBeenCalledWith({ apiKey: "test-key-123", httpOptions: { apiVersion: "v1beta" } });
  });

  it("returns null without a key (rule-based mode)", async () => {
    env.GEMINI_API_KEY = undefined;
    expect((await load())()).toBeNull();
  });
});
