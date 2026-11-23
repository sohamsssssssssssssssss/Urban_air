import { describe, expect, it } from "vitest";
import { parseRoutes } from "@/lib/route/osrm";
import { departAtFromTime } from "@/lib/route/depart";
import car from "../fixtures/live/route-osrm-car.json";
import foot from "../fixtures/live/route-osrm-foot.json";

describe("parseRoutes (real OSRM responses)", () => {
  it("returns every alternative with distance, duration and the share on numbered roads", () => {
    const routes = parseRoutes(car as never);
    expect(routes).toHaveLength(2);
    expect(routes[0]).toMatchObject({ distanceM: expect.closeTo(19_658, -1), durationS: expect.any(Number) });
    expect(routes[0]!.majorShare).toBeCloseTo(0.025, 2); // 491 m of 19.7 km carries the WEH ref
    expect(parseRoutes(foot as never).every((r) => r.majorShare <= 0.01)).toBe(true);
  });
  it("treats motorway/toll classes as major (tunnel is not) and caps the share at 1", () => {
    const step = (distance: number, classes?: string[]) => ({ distance, intersections: [{ classes }] });
    const share = (steps: ReturnType<typeof step>[]) => parseRoutes({ code: "Ok", routes: [{ distance: 1000, duration: 60, legs: [{ steps }] }] })[0]!.majorShare;
    expect(share([step(600, ["toll"]), step(300, ["tunnel"]), step(100)])).toBe(0.6);
    expect(share([step(1200, ["motorway"])])).toBe(1);
  });
  it("returns [] for NoRoute and for empty or zero-distance routes", () => {
    expect(parseRoutes({ code: "NoRoute", routes: [] })).toEqual([]);
    expect(parseRoutes({ code: "Ok", routes: [] })).toEqual([]);
    expect(parseRoutes({ code: "Ok", routes: [{ distance: 0, duration: 0, legs: [] }] })[0]!.majorShare).toBe(0);
  });
});

describe("departAtFromTime", () => {
  const now = Date.parse("2026-11-22T12:00:00Z"); // 17:30 IST
  it("maps IST clock times to today, or tomorrow when more than an hour has passed", () => {
    expect(departAtFromTime("18:00", now)).toBe("2026-11-22T12:30:00.000Z");
    expect(departAtFromTime("17:00", now)).toBe("2026-11-22T11:30:00.000Z"); // 30 min ago: still today
    expect(departAtFromTime("08:00", now)).toBe("2026-11-23T02:30:00.000Z");
  });
  it("means now when empty or malformed", () => {
    expect(departAtFromTime("", now)).toBeUndefined();
    expect(departAtFromTime("25", now)).toBeUndefined();
  });
});
