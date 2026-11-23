import type { z } from "zod";

/** Per-device state lives in `localStorage` under this prefix. There are no accounts and no server copy. */
const PREFIX = "smogsense:v1:";
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
