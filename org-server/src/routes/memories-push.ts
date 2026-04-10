import type { FastifyInstance } from "fastify";
import type { Database as Db } from "better-sqlite3";
import { OrgMemorySchema, BatchPushSchema, type OrgMemory } from "../types.js";
import { makeAuthHook } from "../auth.js";

/**
 * Upsert a single memory. Last-write-wins by `updated_at`.
 *
 * The `WHERE excluded.updated_at >= updated_at` guard on the ON CONFLICT
 * clause means stale writes (older `updated_at` than what's already stored)
 * are silently ignored. This matches the client's local upsert semantics
 * in plugins/continuity-org-memory-sync/src/sync-engine.ts:144.
 */
const UPSERT_SQL = `
INSERT INTO memories (id, key, content, type, scope, tags, version, created_at, updated_at)
VALUES (@id, @key, @content, @type, @scope, @tags, @version, @created_at, @updated_at)
ON CONFLICT(key, scope) DO UPDATE SET
  id          = excluded.id,
  content     = excluded.content,
  type        = excluded.type,
  tags        = excluded.tags,
  version     = MAX(memories.version, excluded.version),
  updated_at  = excluded.updated_at,
  received_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE excluded.updated_at >= memories.updated_at
`;

export async function registerPushRoutes(
  app: FastifyInstance,
  db: Db,
  apiKey: string
): Promise<void> {
  const auth = makeAuthHook(apiKey);
  const upsertStmt = db.prepare(UPSERT_SQL);

  // Wrap the batch upsert in a SQLite transaction. better-sqlite3's
  // `db.transaction(fn)` returns a function that runs `fn` inside a
  // BEGIN/COMMIT pair — atomic across the whole batch, and ~50-100x
  // faster than per-row inserts at any meaningful batch size.
  const upsertMany = db.transaction((rows: OrgMemory[]) => {
    for (const row of rows) {
      upsertStmt.run(row);
    }
  });

  app.post(
    "/api/memories",
    { preHandler: auth },
    async (request, reply) => {
      const parsed = OrgMemorySchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({
          error: "invalid payload",
          details: parsed.error.issues,
        });
        return;
      }
      upsertStmt.run(parsed.data);
      return { ok: true };
    }
  );

  app.post(
    "/api/memories/batch",
    { preHandler: auth },
    async (request, reply) => {
      const parsed = BatchPushSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.code(400).send({
          error: "invalid payload",
          details: parsed.error.issues,
        });
        return;
      }
      upsertMany(parsed.data.memories);
      return { ok: true, count: parsed.data.memories.length };
    }
  );
}
