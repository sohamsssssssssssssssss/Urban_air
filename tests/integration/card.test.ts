import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AQSnapshot } from "@/lib/aq/types";
import { liveSnapshot } from "../fixtures/data";

const getAirQuality = vi.fn();
vi.mock("@/lib/aq", () => ({ getAirQuality }));
const { GET } = await import("@/app/api/card/route");

const live = liveSnapshot as AQSnapshot;
let ip = 0;
const get = (query: string, addr = `10.7.0.${++ip}`) => new Request(`http://localhost/api/card?${query}`, { headers: { "x-forwarded-for": addr } });
const png = async (res: Response) => {
  const bytes = Buffer.from(await res.arrayBuffer());
  return { bytes, signature: bytes.subarray(0, 8).toString("hex"), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const PNG_SIGNATURE = "89504e470d0a1a0a";
const weekly = "kind=weekly&period=week&trips=5&km=62.5&co2=7.2&pm25=140.4";

describe("GET /api/card (real PNG rendering with the bundled Devanagari font)", () => {
  beforeEach(() => {
    getAirQuality.mockReset().mockResolvedValue(live);
  });

  it("renders the weekly card as a 1200x630 PNG in English and Hindi, with different content", async () => {
    const en = await GET(get(`${weekly}&lang=en`));
    expect(en.status).toBe(200);
    expect(en.headers.get("content-type")).toBe("image/png");
    const a = await png(en);
    expect(a).toMatchObject({ signature: PNG_SIGNATURE, width: 1200, height: 630 });
    expect(a.bytes.length).toBeGreaterThan(5_000);
    const b = await png(await GET(get(`${weekly}&lang=hi`)));
    expect(b).toMatchObject({ signature: PNG_SIGNATURE, width: 1200, height: 630 });
    expect(Buffer.compare(a.bytes, b.bytes)).not.toBe(0);
  });

  it("renders the 'today' card from the live reading for the chosen city, in both languages", async () => {
    for (const lang of ["en", "hi"]) {
      const res = await GET(get(`kind=today&city=Mumbai&lang=${lang}`));
      expect(res.status).toBe(200);
      expect(await png(res)).toMatchObject({ signature: PNG_SIGNATURE, width: 1200, height: 630 });
    }
    expect(getAirQuality).toHaveBeenCalledWith({ lat: 19.076, lon: 72.8777, city: "Mumbai" });
  });

  it("caches the shared 'today' card publicly for 10 minutes and the personal card privately", async () => {
    expect((await GET(get("kind=today&city=Delhi&lang=en"))).headers.get("cache-control")).toBe("public, max-age=600, s-maxage=600");
    expect((await GET(get(`${weekly}&lang=en`))).headers.get("cache-control")).toBe("private, max-age=300");
  });

  it("renders negative savings", async () => {
    expect((await GET(get("kind=weekly&period=all&trips=1&km=80&co2=-9.4&pm25=-20.5&lang=en"))).status).toBe(200);
  });

  it.each([
    ["an unknown city", "kind=today&city=Atlantis&lang=en"],
    ["an unknown language", "kind=today&city=Delhi&lang=fr"],
    ["no parameters", ""],
    ["an extra identifying parameter", "kind=today&city=Delhi&lang=en&name=Asha"],
    ["a name smuggled onto the weekly card", `${weekly}&lang=en&name=Asha`],
    ["an empty number", "kind=weekly&period=week&trips=5&km=&co2=1&pm25=1&lang=en"],
    ["an out-of-range number", "kind=weekly&period=week&trips=5&km=62.5&co2=99999&pm25=1&lang=en"],
    ["markup in a value", "kind=today&city=%3Cscript%3E&lang=en"],
  ])("400 for %s, without rendering or calling the air-quality API", async (_, query) => {
    const res = await GET(get(query));
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(getAirQuality).not.toHaveBeenCalled();
  });

  it("503 with a typed error when there is no live data for 'today' (nothing is made up)", async () => {
    const { AQUnavailableError } = await import("@/lib/errors");
    getAirQuality.mockRejectedValue(new AQUnavailableError());
    const res = await GET(get("kind=today&city=Delhi&lang=en"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("AQ_UNAVAILABLE");
  });

  it("is rate-limited per IP because rendering is expensive", async () => {
    const addr = "192.0.2.150";
    const statuses: number[] = [];
    for (let i = 0; i < 24; i++) statuses.push((await GET(get(`${weekly}&lang=en`, addr))).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(20).every((s) => s === 429)).toBe(true);
  });
});
