import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include test files in the tests/ directory
    include: ["tests/**/*.test.ts"],
    // Each test file gets its own fresh process-level state. better-sqlite3
    // is synchronous and we use :memory: DBs so parallel-safe by default.
    pool: "threads",
    // Fail fast in CI, but not so fast we miss useful diagnostic output
    reporters: ["default"],
  },
});
