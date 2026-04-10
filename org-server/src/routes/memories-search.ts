import type { FastifyInstance } from "fastify";
import type { Database as Db } from "better-sqlite3";
import { z } from "zod";
import type { OrgMemory } from "../types.js";
import { makeAuthHook } from "../auth.js";

/**
 * Mirrors the LIKE-based search in server/db/search.ts:15 — consistent with
 * the rest of Continuity and keeps v1 simple. Migrating to SQLite FTS5 is
 * a localized change when search volume demands it.
 */

const SearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const SELECT_COLUMNS =
  "id, key, content, type, scope, tags, version, created_at, updated_at";

export async function registerSearchRoutes(
  app: FastifyInstance,
  db: Db,
  apiKey: string
): Promise<void> {
  const auth = makeAuthHook(apiKey);

  const searchStmt = db.prepare(
    `SELECT ${SELECT_COLUMNS} FROM memories
     WHERE key LIKE ? OR content LIKE ? OR tags LIKE ?
     ORDER BY received_at DESC
     LIMIT ?`
  );
  const countStmt = db.prepare(
    `SELECT COUNT(*) as total FROM memories
     WHERE key LIKE ? OR content LIKE ? OR tags LIKE ?`
  );

  app.get(
    "/api/memories/search",
    { preHandler: auth },
    async (request, reply) => {
      const parsed = SearchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400).send({
          error: "invalid query",
          details: parsed.error.issues,
        });
        return;
      }

      const { q } = parsed.data;
      const limit = parsed.data.limit ?? 10;
      const pattern = `%${q}%`;

      const memories = searchStmt.all(
        pattern,
        pattern,
        pattern,
        limit
      ) as OrgMemory[];
      const totalRow = countStmt.get(pattern, pattern, pattern) as {
        total: number;
      };

      return { memories, total: totalRow.total };
    }
  );
}
