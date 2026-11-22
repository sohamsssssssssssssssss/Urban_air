import { beforeEach, describe, expect, it, vi } from "vitest";
import locations from "../fixtures/live/openaq-locations-delhi.json";
import latestTalkatora from "../fixtures/live/openaq-latest-6254594.json";
import latestLodhi from "../fixtures/live/openaq-latest-5634.json";
import latestIitm from "../fixtures/live/openaq-latest-11607.json";
import hours from "../fixtures/live/openaq-hours-15554208.json";
import cpcb from "../fixtures/live/cpcb-delhi.json";
import { routeFetch } from "../fixtures/data";

const env: Record<string, string | undefined> = {};
vi.mock("@/lib/env", () => ({ env }));

// Fixtures are trimmed real responses captured on 2026-11-22; freeze the clock at capture time.
const NOW = Date.parse(locations.capturedAt);
const DELHI = { lat: 28.61, lon: 77.21 };
const liveOpenAQ: Array<[string, unknown, number?]> = [
  ["/locations/6254594/latest", latestTalkatora],
  ["/locations/5634/latest", latestLodhi],
  ["/locations/11607/latest", latestIitm],
  ["/sensors/15554208/hours", hours],
  ["/locations?", locations],
];
const liveCpcb: [string, unknown] = ["api.data.gov.in", cpcb];
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const oneLocation = (id: number, datetimeLast: string, sensors: Array<[number, string, string]>) => ({
  results: [{ id, name: "Test", locality: null, distance: 100, datetimeLast: { utc: datetimeLast }, sensors: sensors.map(([sid, name, units]) => ({ id: sid, parameter: { name, units } })) }],
});

async function load() {
  vi.resetModules();
  return import("@/lib/aq");
}

describe("getAirQuality (real fixtures)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    Object.assign(env, { OPENAQ_API_KEY: "openaq-key", DATA_GOV_IN_API_KEY: "cpcb-key-123" });
  });

  it("picks the nearest fresh OpenAQ station, skips dead sites, converts ppb and drops mislabelled CO", async () => {
    const fetchMock = vi.fn(routeFetch(liveOpenAQ));
    vi.stubGlobal("fetch", fetchMock);
    const s = await (await load()).getAirQuality(DELHI);
    expect(s.source).toBe("OpenAQ");
    expect(s.station.name).toBe("Talkatora Garden, Delhi - DPCC");
    expect(s).toMatchObject({ aqi: 195, category: "Moderate", dominant: "pm25", stale: false, measuredAt: "2026-11-22T12:30:00.000Z" });
    expect(s.pollutants.pm25).toBe(88.56);
    expect(s.pollutants.no2).toBeCloseTo(27.27, 1); // 14.49 ppb
    expect(s.pollutants.co).toBeUndefined(); // live value 0.34 labelled "ppb" is really ppm: dropped
    expect(s.history).toHaveLength(22);
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => /locations\/(13|15)\/latest/.test(u))).toBe(false); // 2018-dead and never-reporting sites
    expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { "X-API-Key": "openaq-key" } });
  });

  it("falls back to CPCB, treating avg_value as published sub-indices and skipping NA", async () => {
    vi.stubGlobal("fetch", vi.fn(routeFetch([["api.openaq.org", { detail: "down" }, 500], liveCpcb])));
    const s = await (await load()).getAirQuality({ ...DELHI, city: "Delhi" });
    expect(s.source).toBe("CPCB");
    expect(s.station.name).toBe("Mandir Marg, Delhi - DPCC"); // nearest of the three, 3 km
    expect(s.pollutants).toEqual({});
    expect(s.subIndices).toEqual({ pm25: 205, pm10: 127, no2: 19, o3: 53, so2: 37, co: 62 });
    expect(s).toMatchObject({ aqi: 205, category: "Poor", dominant: "pm25", measuredAt: "2026-11-22T12:30:00.000Z" });
  });

  it("falls back to CPCB when every nearby OpenAQ site is dead (the Bengaluru case)", async () => {
    const deadOnly = { results: locations.results.filter((l) => l.id === 13 || l.id === 15) };
    vi.stubGlobal("fetch", vi.fn(routeFetch([["/locations?", deadOnly], liveCpcb])));
    expect((await (await load()).getAirQuality({ ...DELHI, city: "Delhi" })).source).toBe("CPCB");
  });

  it("keeps the freshest of duplicate sensors and ignores future timestamps", async () => {
    const loc = oneLocation(1, hoursAgo(0.5), [[11, "pm25", "µg/m³"], [12, "pm25", "µg/m³"], [13, "pm10", "µg/m³"]]);
    const latest = { results: [
      { datetime: { utc: hoursAgo(2) }, value: 300, sensorsId: 11 },
      { datetime: { utc: hoursAgo(0.5) }, value: 60, sensorsId: 12 },
      { datetime: { utc: hoursAgo(-3) }, value: 999, sensorsId: 13 },
    ] };
    vi.stubGlobal("fetch", vi.fn(routeFetch([["/locations/1/latest", latest], ["/sensors/", { results: [] }], ["/locations?", loc]])));
    const s = await (await load()).getAirQuality(DELHI);
    expect(s.pollutants).toEqual({ pm25: 60 });
    expect(s.aqi).toBe(100);
    expect(s.history).toEqual([]);
  });

  it("flags readings 3-24 h old as stale and rejects older ones", async () => {
    const loc = (t: string) => oneLocation(1, t, [[11, "pm25", "µg/m³"]]);
    const latest = (t: string) => ({ results: [{ datetime: { utc: t }, value: 90, sensorsId: 11 }] });
    vi.stubGlobal("fetch", vi.fn(routeFetch([["/locations/1/latest", latest(hoursAgo(5))], ["/sensors/", { error: "x" }, 500], ["/locations?", loc(hoursAgo(5))]])));
    const s = await (await load()).getAirQuality(DELHI);
    expect(s.stale).toBe(true);
    expect(s.history).toBeUndefined(); // history failure is non-fatal

    env.DATA_GOV_IN_API_KEY = undefined;
    vi.stubGlobal("fetch", vi.fn(routeFetch([["/locations/1/latest", latest(hoursAgo(30))], ["/locations?", loc(hoursAgo(30))]])));
    await expect((await load()).getAirQuality(DELHI)).rejects.toMatchObject({ code: "AQ_UNAVAILABLE" });
  });

  it("derives the CPCB city from coordinates when none is given", async () => {
    const fetchMock = vi.fn(routeFetch([liveCpcb]));
    vi.stubGlobal("fetch", fetchMock);
    env.OPENAQ_API_KEY = undefined;
    await (await load()).getAirQuality(DELHI);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("filters%5Bcity%5D=Delhi");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("limit=1000");
  });

  it("throws AQUnavailableError when every source fails or no key is configured", async () => {
    vi.stubGlobal("fetch", vi.fn(routeFetch([["api.openaq.org", { results: [] }], ["api.data.gov.in", { records: [] }]])));
    await expect((await load()).getAirQuality(DELHI)).rejects.toMatchObject({ code: "AQ_UNAVAILABLE", status: 503 });

    Object.assign(env, { OPENAQ_API_KEY: undefined, DATA_GOV_IN_API_KEY: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect((await load()).getAirQuality(DELHI)).rejects.toMatchObject({ code: "AQ_UNAVAILABLE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles network errors and malformed payloads as source failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("openaq")) throw new TypeError("network");
      return new Response('{"unexpected":true}', { status: 200 });
    }));
    await expect((await load()).getAirQuality({ ...DELHI, city: "Delhi" })).rejects.toMatchObject({ code: "AQ_UNAVAILABLE" });
  });

  it("caches by rounded coordinates and de-duplicates concurrent calls", async () => {
    const fetchMock = vi.fn(routeFetch(liveOpenAQ));
    vi.stubGlobal("fetch", fetchMock);
    const { getAirQuality } = await load();
    await Promise.all([getAirQuality({ lat: 28.611, lon: 77.211 }), getAirQuality({ lat: 28.612, lon: 77.209 })]);
    const calls = fetchMock.mock.calls.length;
    await getAirQuality({ lat: 28.6101, lon: 77.2101 });
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    expect(calls).toBe(5); // locations + 3 latest + 1 history
  });
});
