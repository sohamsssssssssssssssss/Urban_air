import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "@/lib/cache";

describe("createTtlCache", () => {
  it("expires entries after the TTL", () => {
    let t = 0;
    const cache = createTtlCache<number>(1000, 10, () => t);
    cache.set("a", 1);
    t = 999;
    expect(cache.get("a")).toBe(1);
    t = 1000;
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("de-duplicates concurrent loads and caches the result", async () => {
    const cache = createTtlCache<string>(1000);
    const loader = vi.fn(async () => "v");
    const [a, b] = await Promise.all([cache.getOrLoad("k", loader), cache.getOrLoad("k", loader)]);
    expect([a, b]).toEqual(["v", "v"]);
    await cache.getOrLoad("k", loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = createTtlCache<string>(1000);
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("ok");
    await expect(cache.getOrLoad("k", loader)).rejects.toThrow("boom");
    await expect(cache.getOrLoad("k", loader)).resolves.toBe("ok");
  });

  it("evicts the oldest entry beyond max size", () => {
    const cache = createTtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });
});
