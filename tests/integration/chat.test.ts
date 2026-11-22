import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamChat } from "@/lib/ai/chat";
import { profile, snapshot } from "../fixtures/data";

const generateContentStream = vi.fn();
let gemini: unknown = { models: { generateContentStream } };
vi.mock("@/lib/ai/client", () => ({ getGemini: () => gemini }));

async function* chunks(parts: string[], failAfter = Infinity) {
  for (const [i, text] of parts.entries()) {
    if (i >= failAfter) throw new Error("socket closed");
    yield { text };
  }
}
const read = (stream: ReadableStream<Uint8Array>) => new Response(stream).text();
const input = { snapshot, profile, hasMetro: true, language: "en" as const, message: "Can my kid play outside?", history: [{ role: "user" as const, text: "hi" }, { role: "model" as const, text: "hello" }] };

describe("streamChat", () => {
  beforeEach(() => {
    gemini = { models: { generateContentStream } };
    generateContentStream.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("streams text grounded on the snapshot, with user text delimited", async () => {
    generateContentStream.mockResolvedValue(chunks(["Not today", ", AQI 374."]));
    expect(await read(await streamChat(input))).toBe("Not today, AQI 374.");
    const req = generateContentStream.mock.calls[0]?.[0];
    expect(req.config.systemInstruction).toContain("Anand Vihar, Delhi");
    expect(req.contents.at(-1).parts[0].text).toBe("<user_message>Can my kid play outside?</user_message>");
    expect(req.contents[1].parts[0].text).toBe("hello");
    expect(req.config.maxOutputTokens).toBe(600);
  });

  it("appends a notice when the stream breaks midway", async () => {
    generateContentStream.mockResolvedValue(chunks(["Partial", "never"], 1));
    expect(await read(await streamChat(input))).toMatch(/^Partial\n\[The answer was interrupted/);
  });

  it("throws AIUnavailableError without a key or when the call fails", async () => {
    generateContentStream.mockRejectedValue(new Error("quota"));
    await expect(streamChat(input)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    gemini = null;
    await expect(streamChat(input)).rejects.toMatchObject({ code: "AI_UNAVAILABLE", status: 503 });
  });
});
