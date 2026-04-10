import Fastify, { type FastifyInstance } from "fastify";
import type { Database as Db } from "better-sqlite3";
import { registerHealthRoute } from "./routes/health.js";
import { registerPushRoutes } from "./routes/memories-push.js";
import { registerPullRoutes } from "./routes/memories-pull.js";
import { registerSearchRoutes } from "./routes/memories-search.js";

export interface BuildAppOptions {
  db: Db;
  apiKey: string;
  /** Disable Fastify's built-in request logger (tests want silence). */
  silent?: boolean;
}

/**
 * Build the Fastify app with all routes wired up.
 *
 * Critically, this function takes the DB as an argument so tests can inject
 * an in-memory SQLite (`better-sqlite3(':memory:')`) with zero shared state.
 * This is what makes `fastify.inject()` tests fast, deterministic, and
 * parallel-safe.
 */
export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.silent ? false : { level: "info" },
    // Don't leak stack traces to clients
    disableRequestLogging: opts.silent,
  });

  // Routes
  await registerHealthRoute(app);
  await registerPushRoutes(app, opts.db, opts.apiKey);
  await registerPullRoutes(app, opts.db, opts.apiKey);
  await registerSearchRoutes(app, opts.db, opts.apiKey);

  return app;
}
