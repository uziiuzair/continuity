import type { FastifyInstance } from "fastify";
import type { Database as Db } from "better-sqlite3";
import { z } from "zod";
import type { OrgMemory } from "../types.js";
import { makeAuthHook } from "../auth.js";

/**
 * Safety cap — an unbounded pull of the entire org DB would be a foot-gun
 * for a new client or a misconfigured `since` cursor. 1000 rows is generous
 * for team-scale usage but bounded enough to prevent accidental OOM.
 */
const MAX_PULL_ROWS = 1000;

const PullQuerySchema = z.object({
  since: z.string().optional(),
});

const SELECT_COLUMNS =
  "id, key, content, type, scope, tags, version, created_at, updated_at";

export async function registerPullRoutes(
  app: FastifyInstance,
  db: Db,
  apiKey: string
): Promise<void> {
  const auth = makeAuthHook(apiKey);

  // Prepared statements — created once, reused per request.
  const selectAllStmt = db.prepare(
    `SELECT ${SELECT_COLUMNS} FROM memories
     ORDER BY received_at ASC
     LIMIT ?`
  );
  const selectSinceStmt = db.prepare(
    `SELECT ${SELECT_COLUMNS} FROM memories
     WHERE received_at > ?
     ORDER BY received_at ASC
     LIMIT ?`
  );

  app.get(
    "/api/memories",
    { preHandler: auth },
    async (request, reply) => {
      const parsed = PullQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({
          error: "invalid query",
          details: parsed.error.issues,
        });
        return;
      }

      const { since } = parsed.data;
      const rows = (
        since
          ? selectSinceStmt.all(since, MAX_PULL_ROWS)
          : selectAllStmt.all(MAX_PULL_ROWS)
      ) as OrgMemory[];

      return { memories: rows };
    }
  );
}
