import Database from "better-sqlite3";
import type { Database as Db } from "better-sqlite3";

/**
 * SQLite schema for the org memory store.
 *
 * Deliberately a subset of the local memory schema in server/db/schema.ts —
 * only the fields the sync plugin currently sends. Extra local-only fields
 * (metadata, source, archived_at, project_id) are out of scope for v1.
 *
 * `received_at` is the SERVER-SIDE timestamp used for the `since` cursor on
 * pull. It is NOT the same as `updated_at`, which is a client wall-clock and
 * vulnerable to clock skew across distributed clients. By filtering `since`
 * against `received_at`, the cursor is monotonic per-server and immune to
 * client clock drift.
 */
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS memories (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL,
  content     TEXT NOT NULL,
  type        TEXT NOT NULL,
  scope       TEXT NOT NULL,
  tags        TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(key, scope)
);

CREATE INDEX IF NOT EXISTS idx_memories_received_at ON memories(received_at);
CREATE INDEX IF NOT EXISTS idx_memories_key         ON memories(key);
`;

export function openDb(path: string): Db {
  const db = new Database(path);
  // WAL gives better concurrent read performance and is the standard choice
  // for a read-heavy sync service. `synchronous = NORMAL` is the recommended
  // pairing with WAL for a good durability/perf balance.
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initializeSchema(db: Db): void {
  db.exec(SCHEMA_SQL);
}
