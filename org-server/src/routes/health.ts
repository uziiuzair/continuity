import type { FastifyInstance } from "fastify";

/**
 * Public health endpoint — no auth.
 *
 * Used by:
 *  - The sync plugin's `OrgAPI.ping()` to decide whether to attempt a cycle
 *  - Docker HEALTHCHECK
 *  - Load balancers / uptime monitors
 */
export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => {
    return { ok: true };
  });
}
