import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/live/open-meteo-mumbai.json";
import { routeFetch } from "../fixtures/data";

const get = (query: string) => new Request(`http://localhost/api/outlook?${query}`, { headers: { "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
async function load() {
  vi.resetModules();
  return { server: await import("@/features/outlook/server"), route: await import("@/app/api/outlook/route") };
}

describe("getOutlook (Open-Meteo)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.parse("2026-11-23T05:00:00Z") });
  });

  it("requests 48 hourly PM2.5/PM10 values in India time and returns hours with the cleanest windows", async () => {
    const fetchMock = vi.fn(routeFetch([["air-quality-api.open-meteo.com", fixture]]));
    vi.stubGlobal("fetch", fetchMock);
    const { server } = await load();
    const outlook = await server.getOutlook(19.07, 72.88);
    expect(outlook).toMatchObject({ source: "Open-Meteo (CAMS)" });
    expect(outlook.hours).toHaveLength(48);
    expect(outlook.windows).toHaveLength(3);
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ latitude: "19.07", longitude: "72.88", hourly: "pm2_5,pm10", timezone: "Asia/Kolkata", forecast_hours: "48" });
  });

  it("caches for one hour per ~1 km cell and refetches afterwards", async () => {
    const fetchMock = vi.fn(routeFetch([["open-meteo", fixture]]));
    vi.stubGlobal("fetch", fetchMock);
    const { server } = await load();
    await Promise.all([server.getOutlook(19.071, 72.881), server.getOutlook(19.0712, 72.8808)]);
    await server.getOutlook(19.07, 72.88);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 61 * 60_000);
    await server.getOutlook(19.07, 72.88);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an HTTP error", () => new Response("down", { status: 503 })],
    ["a malformed payload", () => new Response('{"hourly":{"time":"x"}}')],
    ["no usable values", () => Response.json({ hourly: { time: ["2026-11-23T10:00"], pm2_5: [null], pm10: [null] } })],
  ])("throws a typed FORECAST_UNAVAILABLE error for %s, and does not cache it", async (_, response) => {
    const fetchMock = vi.fn(async () => response());
    vi.stubGlobal("fetch", fetchMock);
    const { server } = await load();
    await expect(server.getOutlook(19.07, 72.88)).rejects.toMatchObject({ code: "FORECAST_UNAVAILABLE", status: 503 });
    await expect(server.getOutlook(19.07, 72.88)).rejects.toMatchObject({ code: "FORECAST_UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("treats a network failure as FORECAST_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    const { server } = await load();
    await expect(server.getOutlook(19.07, 72.88)).rejects.toMatchObject({ code: "FORECAST_UNAVAILABLE" });
  });
});

describe("GET /api/outlook", () => {
  it("200 with the outlook for valid coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn(routeFetch([["open-meteo", fixture]])));
    const { route } = await load();
    const res = await route.GET(get("lat=19.07&lon=72.88"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");
    expect((await res.json()).outlook.windows).toHaveLength(3);
  });
  it.each(["lat=91&lon=72", "lat=19&lon=181", "lat=abc&lon=72", "lon=72", "lat=19", "", "lat=19&lon=72&extra=1"])("400 for %j without calling Open-Meteo", async (query) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { route } = await load();
    const res = await route.GET(get(query));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("503 FORECAST_UNAVAILABLE when Open-Meteo fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    const { route } = await load();
    const res = await route.GET(get("lat=19.07&lon=72.88"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("FORECAST_UNAVAILABLE");
  });
});
