import Database from "better-sqlite3";
import type { Database as Db } from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { initializeSchema } from "../src/db.js";
import { buildApp } from "../src/app.js";
import type { OrgMemory } from "../src/types.js";

export const TEST_API_KEY = "test-key-123";

export interface TestHarness {
  app: FastifyInstance;
  db: Db;
  /** Clean up the app + db. Call in `afterEach`. */
  close: () => Promise<void>;
}

/**
 * Build a fresh test app backed by an in-memory SQLite DB.
 *
 * This is the linchpin of the test strategy: every test gets its own DB,
 * zero shared state, fully parallel-safe. `better-sqlite3(':memory:')` is
 * instantaneous to construct so there's no perf cost per test.
 */
export async function buildTestApp(): Promise<TestHarness> {
  const db = new Database(":memory:");
  initializeSchema(db);

  const app = await buildApp({
    db,
    apiKey: TEST_API_KEY,
    silent: true,
  });

  // Call `ready()` so Fastify plugin registration settles before any
  // `inject()` calls. Without this, the first inject can race with the
  // preHandler hook registration.
  await app.ready();

  return {
    app,
    db,
    close: async () => {
      await app.close();
      db.close();
    },
  };
}

/**
 * Build an `OrgMemory` fixture with sensible defaults, overridable per-test.
 */
export function makeMemory(overrides: Partial<OrgMemory> = {}): OrgMemory {
  const now = new Date().toISOString();
  return {
    id: `mem-${Math.random().toString(36).slice(2, 10)}`,
    key: "test-key",
    content: "test content",
    type: "context",
    scope: "global",
    tags: null,
    version: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/** Convenience: auth headers with the known test key. */
export const authHeaders = {
  authorization: `Bearer ${TEST_API_KEY}`,
  "content-type": "application/json",
};
