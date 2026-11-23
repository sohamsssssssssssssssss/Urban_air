import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "@/features/shared/zod";

const FEATURES = path.join(process.cwd(), "src/features");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : [path.join(dir, f)]));
/** Files that run only on the server (route handlers and server-only modules), where Zod's JIT is harmless. */
const SERVER_ONLY = new Set(["outlook/server.ts", "feedback/schema.ts", "share/schema.ts"]);

describe("client-side Zod must not probe for eval (CSP has no 'unsafe-eval')", () => {
  it("turns Zod's JIT off", () => {
    expect(z.core.globalConfig.jitless).toBe(true);
    expect(z.object({ a: z.string() }).safeParse({ a: "x" }).success).toBe(true);
  });

  it("every feature file that imports Zod uses the configured copy, except the server-only ones listed", () => {
    const direct = walk(FEATURES)
      .filter((f) => /\.(ts|tsx)$/.test(f) && f.endsWith("shared/zod.ts") === false)
      .filter((f) => /^import (?!type\b)[^;]*from "zod"/m.test(readFileSync(f, "utf8"))) // type-only imports are erased and never reach the browser
      .map((f) => path.relative(FEATURES, f))
      .sort();
    expect(direct).toEqual([...SERVER_ONLY].sort());
  });

  it("imports the configured Zod before any other import in client schema files", () => {
    for (const file of ["alerts/schema.ts", "checklist/logic.ts", "compare/schema.ts", "tracker/schema.ts"]) {
      const first = readFileSync(path.join(FEATURES, file), "utf8").split("\n").find((l) => l.startsWith("import "));
      expect(first, file).toBe('import { z } from "../shared/zod";');
    }
  });
});
