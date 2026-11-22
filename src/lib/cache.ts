import { CACHE_MAX_ENTRIES } from "./constants";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCache<T> {
  /** Returns a fresh cached value, or undefined. */
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  /** Returns the cached value or runs `loader` once, sharing the promise with concurrent callers. */
  getOrLoad(key: string, loader: () => Promise<T>): Promise<T>;
  readonly size: number;
}

/**
 * Creates an in-memory TTL cache with in-flight request de-duplication.
 * Failed loads are not cached, so the next caller retries.
 * @param ttlMs - time to live per entry
 * @param maxEntries - oldest entries are evicted beyond this size
 * @param now - clock, injectable for tests
 */
export function createTtlCache<T>(ttlMs: number, maxEntries = CACHE_MAX_ENTRIES, now: () => number = Date.now): TtlCache<T> {
  const entries = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  function get(key: string): T | undefined {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key: string, value: T): void {
    entries.delete(key); // re-insert so Map order reflects recency
    entries.set(key, { value, expiresAt: now() + ttlMs });
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
  }

  function getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    const pending = inFlight.get(key);
    if (pending) return pending;
    const promise = loader()
      .then((value) => {
        set(key, value);
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  }

  return {
    get,
    set,
    getOrLoad,
    get size() {
      return entries.size;
    },
  };
}
