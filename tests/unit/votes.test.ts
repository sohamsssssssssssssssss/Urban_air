// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readVotes, saveVote } from "@/features/feedback/votes";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

const KEY = "smogsense:v1:feedback";
let storage: MemoryStorage;
beforeEach(() => {
  storage = installMemoryStorage();
});
afterEach(() => vi.restoreAllMocks());

describe("votes on this device", () => {
  it("starts empty and saves votes by tip id, merging with existing ones", () => {
    expect(readVotes()).toEqual({});
    saveVote("purifier", "up");
    saveVote("n95_mask", "down");
    expect(readVotes()).toEqual({ purifier: "up", n95_mask: "down" });
    saveVote("purifier", "down");
    expect(readVotes().purifier).toBe("down");
  });
  it("clears a vote with null and leaves the others", () => {
    saveVote("purifier", "up");
    saveVote("n95_mask", "up");
    saveVote("purifier", null);
    expect(readVotes()).toEqual({ n95_mask: "up" });
  });
  it("ignores corrupt, non-object and invalid entries", () => {
    storage.setItem(KEY, "{garbage");
    expect(readVotes()).toEqual({});
    storage.setItem(KEY, "[1,2]");
    expect(readVotes()).toEqual({});
    storage.setItem(KEY, "null");
    expect(readVotes()).toEqual({});
    storage.setItem(KEY, JSON.stringify({ purifier: "up", n95_mask: "maybe", plants_reality: 5 }));
    expect(readVotes()).toEqual({ purifier: "up" });
  });
  it("never throws when storage is blocked", () => {
    vi.spyOn(storage, "getItem").mockImplementation(() => { throw new DOMException("denied", "SecurityError"); });
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    expect(readVotes()).toEqual({});
    expect(() => saveVote("purifier", "up")).not.toThrow();
  });
});
