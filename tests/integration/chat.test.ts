import { beforeEach, describe, expect, it, vi } from "vitest";
import { streamChat } from "@/lib/ai/chat";
import { profile, snapshot } from "../fixtures/data";

const generateContentStream = vi.fn();
let gemini: unknown = { models: { generateContentStream } };
vi.mock("@/lib/ai/client", async (original) => ({ ...(await original<typeof import("@/lib/ai/client")>()), getGemini: () => gemini }));
const env = vi.hoisted(() => ({ GEMINI_MODEL: undefined as string | undefined }));
vi.mock("@/lib/env", () => ({ env }));

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
    env.GEMINI_MODEL = undefined;
    generateContentStream.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("streams text grounded on the snapshot, with user text delimited", async () => {
    generateContentStream.mockResolvedValue(chunks(["Not today", ", AQI 374."]));
    expect(await read(await streamChat(input))).toBe("Not today, AQI 374.");
    const req = generateContentStream.mock.calls[0]?.[0];
    expect(req.model).toBe("gemini-2.5-flash");
    expect(req.config.thinkingConfig).toEqual({ thinkingBudget: 0 }); // 2.5 family only
    expect(req.config.systemInstruction).toContain("Anand Vihar, Delhi");
    expect(req.contents.at(-1).parts[0].text).toBe("<user_message>Can my kid play outside?</user_message>");
    expect(req.contents[1].parts[0].text).toBe("hello");
    expect(req.config.maxOutputTokens).toBe(600);
  });

  it("appends grounded guidance when the stream breaks midway", async () => {
    generateContentStream.mockResolvedValue(chunks(["Partial", "never"], 1));
    expect(await read(await streamChat(input))).toMatch(/^Partial\n\nAI unavailable\. Showing data-based guidance\./);
  });

  it.each([
    ["How should I commute?", /commute/i],
    ["Can I exercise outside?", /Move workouts/],
    ["Do houseplants help?", /100–1000 plants/],
    ["Do I need a purifier?", /purifier.*MERV-13/i],
    ["Can my child go?", /children's active play/],
    ["Which mask?", /N95\/FFP2/],
  ])("answers %s from the applicable facts on quota errors", async (message, expected) => {
    generateContentStream.mockRejectedValue({ status: 429 });
    const answer = await read(await streamChat({ ...input, message }));
    expect(answer).toContain("AI busy (quota). Showing data-based guidance.");
    expect(answer).toContain("AQI 374 (Very Poor) at Anand Vihar, Delhi");
    expect(answer).toMatch(expected);
  });

  it("uses the previous user question for an impact follow-up in Hindi without an API key", async () => {
    gemini = null;
    const answer = await read(await streamChat({
      ...input, language: "hi", message: "इसका असर कितना है?", history: [{ role: "user", text: "क्या मास्क पहनूँ?" }],
    }));
    expect(answer).toContain("AI कॉन्फ़िगर नहीं है");
    expect(answer).toContain("95%");
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("uses guidance when the model returns no answer", async () => {
    generateContentStream.mockResolvedValue(chunks([" "]));
    expect(await read(await streamChat(input))).toContain("AI unavailable. Showing data-based guidance.");
  });

  it("uses the configured model override", async () => {
    env.GEMINI_MODEL = "custom-model";
    generateContentStream.mockResolvedValue(chunks(["reply"]));
    await read(await streamChat(input));
    expect(generateContentStream).toHaveBeenCalledWith(expect.objectContaining({ model: "custom-model" }));
  });
});
