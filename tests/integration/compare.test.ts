import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import { AQUnavailableError, GeocodeUnavailableError, PlaceNotFoundError } from "@/lib/errors";
import { liveSnapshot, snapshot } from "../fixtures/data";

const getAirQuality = vi.fn();
const geocode = vi.fn();
vi.mock("@/lib/aq", () => ({ getAirQuality }));
vi.mock("@/lib/route/geocode", () => ({ geocode }));
const { compareAir } = await import("@/features/compare/server");
const { POST } = await import("@/app/api/compare/route");

const live = liveSnapshot as AQSnapshot;
const city = (c: "Mumbai" | "Delhi") => ({ lat: c === "Mumbai" ? 19.076 : 28.6139, lon: c === "Mumbai" ? 72.8777 : 77.209, city: c });
let ip = 0;
const post = (body: unknown) => new Request("http://localhost/api/compare", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-forwarded-for": `10.8.0.${++ip}` } });

describe("compareAir", () => {
  beforeEach(() => {
    getAirQuality.mockReset().mockImplementation(async ({ lat }: { lat: number }) => (lat > 25 ? snapshot : live));
    geocode.mockReset();
  });

  it("returns both live readings with category, dominant pollutant, station and best window", async () => {
    const r = await compareAir({ a: city("Mumbai"), b: city("Delhi"), language: "en" });
    expect(r.a).toMatchObject({ status: "ok", label: "Mumbai", aqi: live.aqi, category: live.category, dominant: "pm25", station: live.station.name, source: "OpenAQ", bestWindow: "14:00–17:00", windowMeasured: true });
    expect(r.b).toMatchObject({ status: "ok", label: "Delhi", aqi: 374, bestWindow: "13:00–17:00", windowMeasured: false });
    expect(getAirQuality).toHaveBeenCalledWith({ lat: 19.076, lon: 72.8777, city: "Mumbai" });
  });

  it("geocodes typed places and labels them with the place name", async () => {
    geocode.mockResolvedValue({ lat: 19.12, lon: 72.9, label: "Powai, Mumbai" });
    const r = await compareAir({ a: { query: "Powai" }, b: city("Delhi"), language: "en" });
    expect(geocode).toHaveBeenCalledWith("Powai");
    expect(r.a).toMatchObject({ status: "ok", label: "Powai, Mumbai" });
    expect(getAirQuality).toHaveBeenCalledWith({ lat: 19.12, lon: 72.9, city: undefined });
  });

  it.each([
    ["a place that is not found", new PlaceNotFoundError(), "PLACE_NOT_FOUND"],
    ["place search being down", new GeocodeUnavailableError(), "GEOCODE_UNAVAILABLE"],
  ])("shows %s on that side only", async (_, error, code) => {
    geocode.mockRejectedValue(error);
    const r = await compareAir({ a: { query: "Nowhere" }, b: city("Delhi"), language: "en" });
    expect(r.a).toEqual({ status: "unavailable", label: "Nowhere", code });
    expect(r.b.status).toBe("ok");
  });

  it("shows missing air-quality data on that side only", async () => {
    getAirQuality.mockImplementation(async ({ lat }: { lat: number }) => { if (lat > 25) throw new AQUnavailableError(); return live; });
    const r = await compareAir({ a: city("Mumbai"), b: city("Delhi"), language: "en" });
    expect(r.a.status).toBe("ok");
    expect(r.b).toEqual({ status: "unavailable", label: "Delhi", code: "AQ_UNAVAILABLE" });
  });

  it("returns two unavailable sides (not an error) when neither place has data", async () => {
    getAirQuality.mockRejectedValue(new AQUnavailableError());
    const r = await compareAir({ a: city("Mumbai"), b: city("Delhi"), language: "en" });
    expect([r.a.status, r.b.status]).toEqual(["unavailable", "unavailable"]);
  });

  it("labels coordinate-only places with rounded coordinates", async () => {
    const r = await compareAir({ a: { lat: 19.0761, lon: 72.8771 }, b: city("Delhi"), language: "en" });
    expect(r.a).toMatchObject({ status: "ok", label: "19.08, 72.88" });
  });

  it("propagates unexpected errors (the route turns them into a generic 500)", async () => {
    getAirQuality.mockRejectedValue(new Error("boom"));
    await expect(compareAir({ a: city("Mumbai"), b: city("Delhi"), language: "en" })).rejects.toThrow("boom");
  });
});

describe("POST /api/compare", () => {
  beforeEach(() => {
    getAirQuality.mockReset().mockResolvedValue(live);
  });
  const good = { a: city("Mumbai"), b: city("Delhi"), language: "hi" };

  it("200 with both sides", async () => {
    const res = await POST(post(good));
    expect(res.status).toBe(200);
    expect(Object.keys(await res.json())).toEqual(["a", "b"]);
  });
  it.each([
    ["latitude out of bounds", { ...good, a: { lat: 91, lon: 72 } }],
    ["an unknown city", { ...good, a: { lat: 19, lon: 72, city: "Atlantis" } }],
    ["a one-character place", { ...good, b: { query: "x" } }],
    ["an over-long place", { ...good, b: { query: "x".repeat(201) } }],
    ["a missing place", { a: good.a, language: "en" }],
    ["unknown fields", { ...good, extra: 1 }],
    ["an unknown language", { ...good, language: "fr" }],
  ])("400 for %s, without any lookups", async (_, bad) => {
    const res = await POST(post(bad));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(getAirQuality).not.toHaveBeenCalled();
  });
  it("500 without leaking internals on unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getAirQuality.mockRejectedValue(new Error("db password hunter2"));
    const res = await POST(post(good));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("hunter2");
  });
});
