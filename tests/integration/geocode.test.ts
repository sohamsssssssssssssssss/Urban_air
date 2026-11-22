import { beforeEach, describe, expect, it, vi } from "vitest";
import colaba from "../fixtures/live/route-nominatim-colaba.json";
import bkc from "../fixtures/live/route-nominatim-bkc.json";
import { routeFetch } from "../fixtures/data";

describe("geocode (Nominatim)", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date", "setTimeout"] }));

  it("spaces upstream calls at least 1.1 s apart, caches, and sends the Indian-places filter and an app User-Agent", async () => {
    const stamps: number[] = [];
    const inner = routeFetch([["q=colaba", colaba], ["q=bandra", bkc]]);
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => { stamps.push(Date.now()); return inner(args[0]); });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { geocode } = await import("@/lib/route/geocode");

    const both = Promise.all([geocode("Colaba Causeway, Mumbai"), geocode("Bandra Kurla Complex, Mumbai")]);
    await vi.runAllTimersAsync();
    const [a, b] = await both;
    expect(a).toMatchObject({ lat: 18.9156011, lon: 72.8259092 });
    expect(b.label).toContain("Bandra");
    expect(stamps[1]! - stamps[0]!).toBeGreaterThanOrEqual(1100);

    await geocode("  colaba   causeway, MUMBAI "); // same query after normalisation: served from cache
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("countrycodes=in");
    expect(url).toContain("limit=1");
    expect((fetchMock.mock.calls[0]![1] as { headers: Record<string, string> }).headers["User-Agent"]).toBe("SmogSense/2.0 (air-quality route planner)");
  });

  it("does not poison the queue when one lookup fails", async () => {
    const results = [new Response("busy", { status: 503 }), new Response(JSON.stringify(colaba))];
    vi.stubGlobal("fetch", vi.fn(async () => results.shift()!));
    vi.resetModules();
    const { geocode } = await import("@/lib/route/geocode");
    const failed = geocode("first place").catch((e: unknown) => e);
    const next = geocode("second place");
    await vi.runAllTimersAsync();
    expect(await failed).toMatchObject({ code: "GEOCODE_UNAVAILABLE" });
    expect((await next).lat).toBeCloseTo(18.9156, 3);
  });

  it("rejects results with non-numeric coordinates as not found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ lat: "x", lon: "y", display_name: "?" }]))));
    vi.resetModules();
    const { geocode } = await import("@/lib/route/geocode");
    const run = geocode("odd place").catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    expect(await run).toMatchObject({ code: "PLACE_NOT_FOUND" });
  });
});
