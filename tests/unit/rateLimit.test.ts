import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";

describe("createRateLimiter", () => {
  it("allows a burst up to capacity, then rejects with Retry-After", () => {
    const take = createRateLimiter({ capacity: 3, refillPerSec: 1, now: () => 0 });
    expect([take("ip"), take("ip"), take("ip")].every((r) => r.allowed)).toBe(true);
    expect(take("ip")).toEqual({ allowed: false, retryAfterSec: 1 });
  });

  it("refills over time and isolates keys", () => {
    let t = 0;
    const take = createRateLimiter({ capacity: 1, refillPerSec: 0.5, now: () => t });
    expect(take("a").allowed).toBe(true);
    expect(take("a").allowed).toBe(false);
    expect(take("b").allowed).toBe(true);
    t = 2000;
    expect(take("a").allowed).toBe(true);
  });

  it("bounds memory by evicting old keys", () => {
    const take = createRateLimiter({ capacity: 1, refillPerSec: 0.001, maxKeys: 1, now: () => 0 });
    take("a");
    take("b"); // evicts a
    expect(take("a").allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the last X-Forwarded-For hop (appended by Google's front end)", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
