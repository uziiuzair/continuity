import { getDb } from "./connection.js";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'context'
    CHECK (type IN ('decision', 'preference', 'context', 'constraint', 'pattern')),
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'project')),
  project_id TEXT REFERENCES projects(id),
  tags TEXT,
  metadata TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(key, scope, project_id)
);

CREATE TABLE IF NOT EXISTS memory_versions (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL REFERENCES memories(id),
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  changed_by TEXT,
  change_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_links (
  id TEXT PRIMARY KEY,
  memory_id_a TEXT NOT NULL REFERENCES memories(id),
  memory_id_b TEXT NOT NULL REFERENCES memories(id),
  relationship_type TEXT NOT NULL DEFAULT 'related'
    CHECK (relationship_type IN ('related', 'depends_on', 'contradicts', 'supersedes', 'implements')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(memory_id_a, memory_id_b, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_memories_key_scope ON memories(key, scope, project_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope);
CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_versions_memory_id ON memory_versions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_a ON memory_links(memory_id_a);
CREATE INDEX IF NOT EXISTS idx_memory_links_b ON memory_links(memory_id_b);
`;

export function initializeSchema(): void {
  const db = getDb();
  db.exec(SCHEMA_SQL);
}
