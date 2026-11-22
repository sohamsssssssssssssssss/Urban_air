import { beforeEach, describe, expect, it, vi } from "vitest";
import { AQUnavailableError } from "@/lib/errors";
import { location, profile, snapshot } from "../fixtures/data";

const getAirQuality = vi.fn();
vi.mock("@/lib/aq", () => ({ getAirQuality }));
const generateContentStream = vi.fn();
let gemini: unknown = null;
vi.mock("@/lib/ai/client", () => ({ getGemini: () => gemini }));

const { GET: air } = await import("@/app/api/air/route");
const { POST: advice } = await import("@/app/api/advice/route");
const { POST: chat } = await import("@/app/api/chat/route");

let ipCounter = 0;
const ip = () => `10.0.0.${++ipCounter}`;
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": ip(), ...headers } });
const get = (query: string, addr = ip()) => new Request(`http://localhost/api/air?${query}`, { headers: { "x-forwarded-for": addr } });

describe("API routes", () => {
  beforeEach(() => {
    getAirQuality.mockReset().mockResolvedValue(snapshot);
    gemini = null;
  });

  describe("GET /api/air", () => {
    it("200 with snapshot", async () => {
      const res = await air(get("lat=28.64&lon=77.31&city=Delhi"));
      expect(res.status).toBe(200);
      expect((await res.json()).snapshot.aqi).toBe(374);
      expect(getAirQuality).toHaveBeenCalledWith({ lat: 28.64, lon: 77.31, city: "Delhi" });
    });
    it("400 on out-of-bounds or missing coordinates", async () => {
      const res = await air(get("lat=200&lon=77"));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toEqual({ code: "BAD_REQUEST", message: "Invalid fields: lat" });
      expect((await air(get("lon=77"))).status).toBe(400);
    });
    it("503 when live data is unavailable", async () => {
      getAirQuality.mockRejectedValue(new AQUnavailableError());
      const res = await air(get("lat=28.6&lon=77.2"));
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe("AQ_UNAVAILABLE");
    });
    it("429 after the per-IP burst, with Retry-After", async () => {
      const addr = "203.0.113.9";
      for (let i = 0; i < 20; i++) await air(get("lat=28.6&lon=77.2", addr));
      const res = await air(get("lat=28.6&lon=77.2", addr));
      expect(res.status).toBe(429);
      expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    });
  });

  describe("POST /api/advice", () => {
    it("200 with rule-based advice when AI is not configured", async () => {
      const res = await advice(post("/api/advice", { location, profile, language: "en" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.generatedBy).toBe("rules");
      expect(body.snapshot.station.name).toBe("Anand Vihar, Delhi");
      expect(body.advice.alternatives.length).toBeGreaterThan(0);
    });
    it("400 on malformed JSON, oversize body or invalid profile", async () => {
      expect((await advice(post("/api/advice", "{nope"))).status).toBe(400);
      expect((await advice(post("/api/advice", "x".repeat(20_000)))).status).toBe(400);
      const res = await advice(post("/api/advice", { location, profile: { ...profile, commuteKm: -5 }, language: "en" }));
      expect((await res.json()).error.message).toBe("Invalid fields: profile.commuteKm");
    });
    it("503 and no AI call when live data is unavailable", async () => {
      getAirQuality.mockRejectedValue(new AQUnavailableError());
      expect((await advice(post("/api/advice", { location, profile, language: "en" }))).status).toBe(503);
    });
    it("500 without leaking internals on unexpected errors", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      getAirQuality.mockRejectedValue(new Error("secret stack detail"));
      const res = await advice(post("/api/advice", { location, profile, language: "en" }));
      expect(res.status).toBe(500);
      expect(await res.text()).not.toContain("secret");
    });
  });

  describe("POST /api/chat", () => {
    const body = { location, profile, language: "en", message: "Should I run outside?", history: [] };
    it("200 streams plain text", async () => {
      gemini = { models: { generateContentStream } };
      generateContentStream.mockResolvedValue((async function* () { yield { text: "Best after 13:00." }; })());
      const res = await chat(post("/api/chat", body));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/plain");
      expect(await res.text()).toBe("Best after 13:00.");
    });
    it("400 when the message exceeds 500 characters", async () => {
      expect((await chat(post("/api/chat", { ...body, message: "a".repeat(501) }))).status).toBe(400);
    });
    it("503 when AI is unavailable", async () => {
      const res = await chat(post("/api/chat", body));
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe("AI_UNAVAILABLE");
    });
  });
});
