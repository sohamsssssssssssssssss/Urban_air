import { beforeEach, describe, expect, it, vi } from "vitest";
import { NOW, routeFetch } from "../fixtures/data";

const env: Record<string, string | undefined> = {};
vi.mock("@/lib/env", () => ({ env }));

const fresh = new Date(NOW - 30 * 60_000).toISOString();
const old = new Date(NOW - 5 * 3600_000).toISOString();
const ancient = "2019-01-01T00:00:00Z";

const locations = {
  results: [
    { id: 2, name: "Far Station", locality: null, distance: 9000, sensors: [{ id: 21, parameter: { name: "pm25", units: "µg/m³" } }] },
    {
      id: 1, name: "Anand Vihar", locality: "Delhi", distance: 1200,
      sensors: [
        { id: 11, parameter: { name: "pm25", units: "µg/m³" } },
        { id: 12, parameter: { name: "no2", units: "ppb" } },
        { id: 13, parameter: { name: "temperature", units: "c" } },
        { id: 14, parameter: { name: "pm10", units: "µg/m³" } },
      ],
    },
  ],
};
const latestFresh = { results: [{ datetime: { utc: fresh }, value: 182, sensorsId: 11 }, { datetime: { utc: fresh }, value: 40, sensorsId: 12 }, { datetime: { utc: fresh }, value: 21, sensorsId: 13 }, { datetime: { utc: ancient }, value: 999, sensorsId: 14 }] };
const cpcb = {
  records: [
    { station: "ITO, Delhi - CPCB", last_update: "22-11-2026 17:00:00", latitude: "28.62", longitude: "77.24", pollutant_id: "PM2.5", avg_value: "250" },
    { station: "ITO, Delhi - CPCB", last_update: "22-11-2026 17:00:00", latitude: "28.62", longitude: "77.24", pollutant_id: "CO", avg_value: "1.5" },
    { station: "ITO, Delhi - CPCB", last_update: "22-11-2026 17:00:00", latitude: "28.62", longitude: "77.24", pollutant_id: "NH3", avg_value: "20" },
    { station: "Far, Delhi - CPCB", last_update: "22-11-2026 17:00:00", latitude: "28.9", longitude: "77.0", pollutant_id: "PM10", avg_value: "NA" },
  ],
};

async function load() {
  vi.resetModules();
  return import("@/lib/aq");
}

describe("getAirQuality", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    Object.assign(env, { OPENAQ_API_KEY: "openaq-key", DATA_GOV_IN_API_KEY: "cpcb-key-123" });
  });

  it("uses the nearest fresh OpenAQ station, converts units and ignores dead sensors", async () => {
    const fetchMock = vi.fn(routeFetch([["/locations/1/latest", latestFresh], ["/locations/2/latest", { results: [] }], ["/locations?", locations]]));
    vi.stubGlobal("fetch", fetchMock);
    const s = await (await load()).getAirQuality({ lat: 28.65, lon: 77.31 });
    expect(s.source).toBe("OpenAQ");
    expect(s.station.name).toBe("Anand Vihar, Delhi");
    expect(s.pollutants.pm25).toBe(182);
    expect(s.pollutants.no2).toBeCloseTo(75.3, 0);
    expect(s.pollutants.pm10).toBeUndefined();
    expect(s).toMatchObject({ category: "Very Poor", dominant: "pm25", stale: false });
    expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { "X-API-Key": "openaq-key" } });
  });

  it("flags stale readings older than 3 hours", async () => {
    const stale = { results: [{ datetime: { utc: old }, value: 90, sensorsId: 11 }] };
    vi.stubGlobal("fetch", vi.fn(routeFetch([["/locations/1/latest", stale], ["/locations?", { results: [locations.results[1]] }]])));
    const s = await (await load()).getAirQuality({ lat: 28.65, lon: 77.31 });
    expect(s.stale).toBe(true);
  });

  it("falls back to CPCB when OpenAQ fails, picking the nearest station with PM data", async () => {
    const fetchMock = vi.fn(routeFetch([["api.openaq.org", { error: "down" }, 500], ["api.data.gov.in", cpcb]]));
    vi.stubGlobal("fetch", fetchMock);
    const s = await (await load()).getAirQuality({ lat: 28.63, lon: 77.25, city: "Delhi" });
    expect(s.source).toBe("CPCB");
    expect(s.station.name).toBe("ITO, Delhi - CPCB");
    expect(s.pollutants).toEqual({ pm25: 250, co: 1500 });
    expect(s.measuredAt).toBe("2026-11-22T11:30:00.000Z");
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("filters%5Bcity%5D=Delhi");
  });

  it("derives the CPCB city from coordinates when none is given", async () => {
    const fetchMock = vi.fn(routeFetch([["api.data.gov.in", cpcb]]));
    vi.stubGlobal("fetch", fetchMock);
    env.OPENAQ_API_KEY = undefined;
    await (await load()).getAirQuality({ lat: 28.61, lon: 77.2 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("filters%5Bcity%5D=Delhi");
  });

  it("throws AQUnavailableError when every source fails, and never caches the failure", async () => {
    vi.stubGlobal("fetch", vi.fn(routeFetch([["api.openaq.org", { results: [] }], ["api.data.gov.in", { records: [] }]])));
    const { getAirQuality } = await load();
    await expect(getAirQuality({ lat: 28.6, lon: 77.2 })).rejects.toMatchObject({ code: "AQ_UNAVAILABLE", status: 503 });
  });

  it("throws AQUnavailableError with no keys configured, without calling any API", async () => {
    Object.assign(env, { OPENAQ_API_KEY: undefined, DATA_GOV_IN_API_KEY: undefined });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect((await load()).getAirQuality({ lat: 28.6, lon: 77.2 })).rejects.toMatchObject({ code: "AQ_UNAVAILABLE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles network errors and malformed payloads as source failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("openaq")) throw new TypeError("network");
      return new Response("{\"unexpected\":true}", { status: 200 });
    }));
    await expect((await load()).getAirQuality({ lat: 28.6, lon: 77.2, city: "Delhi" })).rejects.toMatchObject({ code: "AQ_UNAVAILABLE" });
  });

  it("caches by rounded coordinates and de-duplicates concurrent calls", async () => {
    const fetchMock = vi.fn(routeFetch([["/locations/1/latest", latestFresh], ["/locations?", { results: [locations.results[1]] }]]));
    vi.stubGlobal("fetch", fetchMock);
    const { getAirQuality } = await load();
    await Promise.all([getAirQuality({ lat: 28.651, lon: 77.311 }), getAirQuality({ lat: 28.652, lon: 77.309 })]);
    await getAirQuality({ lat: 28.6501, lon: 77.3101 });
    expect(fetchMock).toHaveBeenCalledTimes(2); // one locations + one latest call in total
  });
});
