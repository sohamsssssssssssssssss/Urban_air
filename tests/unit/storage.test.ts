// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clearStored, istDayKey, readStored, writeStored } from "@/features/shared/storage";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

const Schema = z.object({ n: z.number() });
const FALLBACK = { n: -1 };

let storage: MemoryStorage;
beforeEach(() => {
  storage = installMemoryStorage();
});
afterEach(() => vi.restoreAllMocks());

describe("readStored / writeStored (per-device state, never throws)", () => {
  it("round-trips validated data under a versioned key", () => {
    expect(writeStored("demo", { n: 5 })).toBe(true);
    expect(window.localStorage.getItem("smogsense:v1:demo")).toBe('{"n":5}');
    expect(readStored("demo", Schema, FALLBACK)).toEqual({ n: 5 });
  });
  it("returns the fallback for missing, corrupt or wrongly-shaped data", () => {
    expect(readStored("missing", Schema, FALLBACK)).toBe(FALLBACK);
    window.localStorage.setItem("smogsense:v1:demo", "{not json");
    expect(readStored("demo", Schema, FALLBACK)).toBe(FALLBACK);
    window.localStorage.setItem("smogsense:v1:demo", '{"n":"five"}');
    expect(readStored("demo", Schema, FALLBACK)).toBe(FALLBACK);
  });
  it("survives blocked storage (private mode / disabled cookies)", () => {
    vi.spyOn(storage, "getItem").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); });
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    vi.spyOn(storage, "removeItem").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); });
    expect(readStored("demo", Schema, FALLBACK)).toBe(FALLBACK);
    expect(writeStored("demo", { n: 1 })).toBe(false);
    expect(() => clearStored("demo")).not.toThrow();
  });
  it("clears one key only", () => {
    writeStored("a", { n: 1 });
    writeStored("b", { n: 2 });
    clearStored("a");
    expect(readStored("a", Schema, FALLBACK)).toBe(FALLBACK);
    expect(readStored("b", Schema, FALLBACK)).toEqual({ n: 2 });
  });
});

describe("istDayKey", () => {
  it("rolls over at midnight India time, not UTC", () => {
    expect(istDayKey(Date.parse("2026-11-22T18:29:59Z"))).toBe("2026-11-22");
    expect(istDayKey(Date.parse("2026-11-22T18:30:00Z"))).toBe("2026-11-23");
    expect(istDayKey(Date.parse("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});
