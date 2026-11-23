/**
 * In-memory `Storage` for jsdom tests. Node 25 ships an experimental `localStorage` global that shadows
 * jsdom's and has no working methods, so tests install this instead (real browsers are unaffected).
 */
export class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

/** Replaces `localStorage` on `window` and `globalThis` with a fresh in-memory store. */
export function installMemoryStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  for (const target of [window, globalThis]) Object.defineProperty(target, "localStorage", { value: storage, configurable: true, writable: true });
  return storage;
}
