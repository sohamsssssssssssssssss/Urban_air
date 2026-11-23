import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import colaba from "../fixtures/live/route-nominatim-colaba.json";
import bkc from "../fixtures/live/route-nominatim-bkc.json";
import car from "../fixtures/live/route-osrm-car.json";
import bike from "../fixtures/live/route-osrm-bike.json";
import foot from "../fixtures/live/route-osrm-foot.json";
import { liveSnapshot, routeFetch } from "../fixtures/data";

const getAirQuality = vi.fn();
vi.mock("@/lib/aq", () => ({ getAirQuality }));
const generateContent = vi.fn();
let gemini: unknown = null;
const env = vi.hoisted(() => ({ GEMINI_MODEL: undefined as string | undefined }));
vi.mock("@/lib/env", () => ({ env }));
vi.mock("@/lib/ai/client", async (original) => ({ ...(await original<typeof import("@/lib/ai/client")>()), getGemini: () => gemini }));

const NOW = Date.parse("2026-11-22T12:00:00Z");
const snapshot = { ...(liveSnapshot as AQSnapshot), station: { id: "openaq:1", name: "Worli, Mumbai", distanceM: 2_000 } };
const upstream: Array<[string, unknown, number?]> = [
  ["q=colaba", colaba], ["q=bandra", bkc], ["routed-car", car], ["routed-bike", bike], ["routed-foot", foot],
];
const request = { origin: { query: "Colaba Causeway, Mumbai" }, destination: { query: "Bandra Kurla Complex, Mumbai" }, language: "en" as const };
const mockFetch = (routes = upstream) => vi.fn(routeFetch(routes));
/** Built after `vi.resetModules()` so it is the same class the route code checks with `instanceof`. */
const unavailable = async () => {
  const { AQUnavailableError } = await import("@/lib/errors");
  throw new AQUnavailableError();
};

async function plan(req: Parameters<typeof import("@/lib/route").planRoutes>[0] = request) {
  vi.resetModules();
  const { planRoutes } = await import("@/lib/route");
  const run = planRoutes(req, NOW);
  run.catch(() => undefined); // observed here so a rejection during the timer flush is not "unhandled"; the caller still sees it
  await vi.runAllTimersAsync(); // lets the 1 request/second Nominatim throttle elapse
  return run;
}

describe("planRoutes", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date", "setTimeout"] });
    getAirQuality.mockReset().mockResolvedValue(snapshot);
    generateContent.mockReset();
    gemini = null;
    env.GEMINI_MODEL = undefined;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns at least two alternatives per mode, scored in code and labelled", async () => {
    vi.stubGlobal("fetch", mockFetch());
    const r = await plan();
    expect(r.modes.map((m) => m.mode)).toEqual(["walk", "cycle", "two_wheeler", "car"]);
    for (const m of r.modes) {
      expect(m.routes.length).toBeGreaterThanOrEqual(2);
      expect(m.routes.map((x) => x.pm25Ug)).toEqual([...m.routes.map((x) => x.pm25Ug)].sort((a, b) => a - b)); // best first
    }
    expect(r.origin.label).toMatch(/Colaba/);
    expect(r.approximate).toBe(false);
    expect(r.air).toMatchObject({ station: "Worli, Mumbai", source: "OpenAQ", basis: "hourly-profile" });
    const labels = r.cards.flatMap((c) => c.labels).sort();
    expect(labels).toEqual(["balance", "cleanest", "fastest"]);
    const cleanest = r.cards.find((c) => c.labels.includes("cleanest"))!.route;
    expect(r.modes.every((m) => m.routes[0]!.pm25Ug >= cleanest.pm25Ug)).toBe(true);
    const fastest = r.cards.find((c) => c.labels.includes("fastest"))!.route;
    expect(r.modes.every((m) => m.routes[0]!.durationMin >= fastest.durationMin)).toBe(true);
  });

  it("makes one OSRM call per profile (two-wheeler shares the car network) and one place search per place", async () => {
    const fetchMock = mockFetch();
    vi.stubGlobal("fetch", fetchMock);
    await plan();
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("routed-car"))).toHaveLength(1);
    expect(urls.filter((u) => u.includes("nominatim"))).toHaveLength(2);
    expect(urls.find((u) => u.includes("routed-foot"))).toContain("alternatives=true");
    expect(((fetchMock.mock.calls as unknown[][]).find((c) => String(c[0]).includes("nominatim"))![1] as { headers: Record<string, string> }).headers["User-Agent"]).toMatch(/^SmogSense/);
  });

  it("scores later departures with the station's profile for that time", async () => {
    vi.stubGlobal("fetch", mockFetch());
    const soon = await plan({ ...request, origin: { lat: 18.9156, lon: 72.8259 }, destination: { lat: 19.0593, lon: 72.8613 }, departAt: new Date(NOW).toISOString() });
    const later = await plan({ ...request, origin: { lat: 18.9156, lon: 72.8259 }, destination: { lat: 19.0593, lon: 72.8613 }, departAt: new Date(NOW + 6 * 3_600_000).toISOString() });
    expect(soon.modes[0]!.routes[0]!.pm25Ug).not.toBe(later.modes[0]!.routes[0]!.pm25Ug);
  });

  describe("approximate flag", () => {
    it("is set when the nearest monitor is farther than 25 km", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockResolvedValue({ ...snapshot, station: { ...snapshot.station, distanceM: 31_000 } });
      expect((await plan()).approximate).toBe(true);
    });
    it("is set when the station distance is unknown", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockResolvedValue({ ...snapshot, station: { id: "x", name: "No distance" } });
      expect((await plan()).approximate).toBe(true);
    });
    it("is set when the origin has no monitor and the city-level reading is used", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockImplementationOnce(unavailable).mockResolvedValueOnce(snapshot);
      const r = await plan();
      expect(r.approximate).toBe(true);
      expect(getAirQuality.mock.calls[1]![0]).toMatchObject({ city: "Mumbai" });
    });
    it("is set, with the concentration inferred from the CPCB sub-index, when only a sub-index exists", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockResolvedValue({ ...snapshot, source: "CPCB", pollutants: {}, history: undefined, subIndices: { pm25: 100 } });
      const r = await plan();
      expect(r).toMatchObject({ approximate: true, air: { basis: "sub-index" } });
      expect(r.modes[0]!.routes[0]!.ambientUgm3).toBe(60); // PM2.5 sub-index 100 = 60 µg/m³ (CPCB breakpoint)
    });
    it("uses a single latest reading (not approximate) when the station has no hourly history", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockResolvedValue({ ...snapshot, history: undefined });
      const r = await plan();
      expect(r).toMatchObject({ approximate: false, air: { basis: "latest" } });
      expect(r.modes[0]!.routes[0]!.ambientUgm3).toBe(snapshot.pollutants.pm25 === undefined ? 0 : Math.round(snapshot.pollutants.pm25 * 10) / 10);
    });
    it("fails with a typed AQ error when neither the origin nor the city has data", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockImplementation(unavailable);
      await expect(plan()).rejects.toMatchObject({ code: "AQ_UNAVAILABLE", status: 503 });
    });
    it("fails when no PM2.5 can be derived at all", async () => {
      vi.stubGlobal("fetch", mockFetch());
      getAirQuality.mockResolvedValue({ ...snapshot, pollutants: { pm10: 100 }, subIndices: { pm10: 90 }, history: undefined });
      await expect(plan()).rejects.toMatchObject({ code: "AQ_UNAVAILABLE" });
    });
  });

  describe("upstream failures are typed errors, not crashes", () => {
    it("Nominatim down -> 503 GEOCODE_UNAVAILABLE", async () => {
      vi.stubGlobal("fetch", mockFetch([["nominatim", { error: "busy" }, 503]]));
      await expect(plan()).rejects.toMatchObject({ code: "GEOCODE_UNAVAILABLE", status: 503 });
    });
    it("Nominatim network error -> 503 GEOCODE_UNAVAILABLE", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
      await expect(plan()).rejects.toMatchObject({ code: "GEOCODE_UNAVAILABLE" });
    });
    it("unknown place -> 404 PLACE_NOT_FOUND", async () => {
      vi.stubGlobal("fetch", mockFetch([["nominatim", []]]));
      await expect(plan()).rejects.toMatchObject({ code: "PLACE_NOT_FOUND", status: 404 });
    });
    it("one OSRM profile failing drops only that mode", async () => {
      vi.stubGlobal("fetch", mockFetch([...upstream.filter(([k]) => k !== "routed-foot"), ["routed-foot", { message: "boom" }, 500]]));
      const r = await plan();
      expect(r.unavailableModes).toEqual(["walk"]);
      expect(r.modes.map((m) => m.mode)).toEqual(["cycle", "two_wheeler", "car"]);
    });
    it("OSRM NoRoute for every profile -> 503 ROUTE_UNAVAILABLE", async () => {
      const none = { code: "NoRoute", routes: [] };
      vi.stubGlobal("fetch", mockFetch([["q=colaba", colaba], ["q=bandra", bkc], ["routed-", none]]));
      await expect(plan()).rejects.toMatchObject({ code: "ROUTE_UNAVAILABLE", status: 503 });
    });
    it("OSRM down for every profile -> 503 ROUTE_UNAVAILABLE", async () => {
      vi.stubGlobal("fetch", mockFetch([["q=colaba", colaba], ["q=bandra", bkc]])); // OSRM URLs 404
      await expect(plan()).rejects.toMatchObject({ code: "ROUTE_UNAVAILABLE" });
    });
  });

  describe("request validation", () => {
    it.each([
      ["same place", { origin: { lat: 19.07, lon: 72.87 }, destination: { lat: 19.07, lon: 72.87 } }, /same place/],
      ["too far apart", { origin: { lat: 19.07, lon: 72.87 }, destination: { lat: 28.61, lon: 77.2 } }, /within 60 km/],
      ["departure far in the past", { origin: { lat: 19.07, lon: 72.87 }, destination: { lat: 19.1, lon: 72.9 }, departAt: new Date(NOW - 5 * 3_600_000).toISOString() }, /departAt/],
      ["departure beyond 24 h", { origin: { lat: 19.07, lon: 72.87 }, destination: { lat: 19.1, lon: 72.9 }, departAt: new Date(NOW + 30 * 3_600_000).toISOString() }, /departAt/],
    ])("rejects %s with a ValidationError (400)", async (_, body, message) => {
      vi.stubGlobal("fetch", mockFetch());
      await expect(plan({ ...request, ...body })).rejects.toMatchObject({ code: "BAD_REQUEST", status: 400, message: expect.stringMatching(message) });
    });
  });

  describe("Gemini rewrites the reasons only", () => {
    const reply = (reasons: unknown) => ({ text: JSON.stringify({ reasons }) });
    beforeEach(() => {
      vi.stubGlobal("fetch", mockFetch());
      gemini = { models: { generateContent } };
    });

    it("keeps the computed sentences when Gemini is not configured", async () => {
      gemini = null;
      const r = await plan();
      expect(r).toMatchObject({ reasonsBy: "computed", fallbackReason: "auth" });
      expect(r.cards.every((c) => /estimated/.test(c.reason))).toBe(true);
    });

    it("uses Gemini's wording when it only reuses computed numbers", async () => {
      generateContent.mockImplementation(async ({ contents }: { contents: string }) => {
        const cards = JSON.parse(contents.replace(/^CONTEXT: /, "")) as Array<{ id: string; minutes: number; estimatedPm25Ug: number }>;
        return reply(cards.map((c) => ({ id: c.id, reason: `An estimated ${c.estimatedPm25Ug} µg of PM2.5 over ${c.minutes} minutes.` })));
      });
      const r = await plan();
      expect(r.reasonsBy).toBe("gemini");
      for (const c of r.cards) expect(c.reason).toBe(`An estimated ${c.route.pm25Ug} µg of PM2.5 over ${c.route.durationMin} minutes.`);
      expect(generateContent.mock.calls[0]![0].config.responseMimeType).toBe("application/json");
    });

    it("rejects a reason with an invented number or a 'measured' claim and keeps the computed sentence", async () => {
      generateContent.mockImplementation(async ({ contents }: { contents: string }) => {
        const cards = JSON.parse(contents.replace(/^CONTEXT: /, "")) as Array<{ id: string }>;
        return reply(cards.map((c, i) => ({ id: c.id, reason: i === 0 ? "You will inhale 987654 µg." : "The measured exposure is low." })));
      });
      const r = await plan();
      expect(r).toMatchObject({ reasonsBy: "computed", fallbackReason: "schema" });
      expect(r.cards.every((c) => /estimated/.test(c.reason) && !/987654|measured/.test(c.reason))).toBe(true);
    });

    it("fails over on a retired model and reports the reason code when every model fails", async () => {
      generateContent.mockRejectedValue({ status: 404, message: "models/x is no longer available to new users" });
      const r = await plan();
      expect(r).toMatchObject({ reasonsBy: "computed", fallbackReason: "model" });
      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(r)).not.toContain("no longer available"); // code only, never the provider message
    });
  });
});
