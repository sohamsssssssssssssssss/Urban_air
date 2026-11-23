import type { z } from "zod";

/** Per-device state lives in `localStorage` under this prefix. There are no accounts and no server copy. */
export const STORAGE_PREFIX = "smogsense:v1:";
const PREFIX = STORAGE_PREFIX;
const IST_OFFSET_MS = 330 * 60_000;

/**
 * Reads and validates stored state. Missing, corrupt, wrongly-shaped or blocked storage (private mode,
 * disabled cookies) all return the fallback instead of throwing.
 */
export function readStored<S extends z.ZodType>(name: string, schema: S, fallback: z.infer<S>): z.infer<S> {
  try {
    const raw = window.localStorage.getItem(PREFIX + name);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/** Writes state; returns false (and keeps running) when storage is full or blocked. */
export function writeStored(name: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(PREFIX + name, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Removes one stored key. */
export function clearStored(name: string): void {
  try {
    window.localStorage.removeItem(PREFIX + name);
  } catch {
    /* storage blocked: nothing to clear */
  }
}

/** Calendar date in India (`YYYY-MM-DD`), used to reset daily state at local midnight. */
export function istDayKey(now = Date.now()): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Reads a simple on/off preference (no Zod, so it can run in the first-load bundle). False if missing or blocked. */
export function readFlag(name: string): boolean {
  try {
    return window.localStorage.getItem(PREFIX + name) === "true";
  } catch {
    return false;
  }
}

/** Saves a simple on/off preference; returns false when storage is blocked. */
export function writeFlag(name: string, value: boolean): boolean {
  return writeStored(name, value);
}
