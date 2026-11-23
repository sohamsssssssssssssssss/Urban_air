import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // "server-only" throws outside the React Server bundle; tests run in plain Node.
      "server-only": path.resolve(import.meta.dirname, "tests/fixtures/empty.ts"),
    },
  },
  test: {
    include: ["tests/{unit,integration,component}/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/features/**/*.ts"],
      reporter: ["text", "text-summary", "html"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
