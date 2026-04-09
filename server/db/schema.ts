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
  source TEXT NOT NULL DEFAULT 'ai'
    CHECK (source IN ('user', 'ai', 'system')),
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

CREATE TABLE IF NOT EXISTS narratives (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'project')),
  project_id TEXT REFERENCES projects(id),
  content TEXT NOT NULL,
  sections TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  confidence REAL NOT NULL DEFAULT 0.5,
  last_synthesized_at TEXT NOT NULL DEFAULT (datetime('now')),
  memory_snapshot_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope, project_id)
);

CREATE TABLE IF NOT EXISTS learnings (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global',
  project_id TEXT REFERENCES projects(id),
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('correction', 'preference', 'rejection', 'approval', 'explicit', 'behavioral')),
  observation TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.5,
  source_thread_id TEXT,
  source_message_id TEXT,
  absorbed_into_narrative INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memories_key_scope ON memories(key, scope, project_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);
CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_versions_memory_id ON memory_versions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_a ON memory_links(memory_id_a);
CREATE INDEX IF NOT EXISTS idx_memory_links_b ON memory_links(memory_id_b);
CREATE INDEX IF NOT EXISTS idx_narratives_scope ON narratives(scope, project_id);
CREATE INDEX IF NOT EXISTS idx_learnings_scope ON learnings(scope, project_id);
CREATE INDEX IF NOT EXISTS idx_learnings_unabsorbed ON learnings(absorbed_into_narrative);
`;

// Migrations for existing databases
const MIGRATIONS_SQL = `
-- Add source column to memories if it doesn't exist (for existing DBs)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check programmatically
`;

function runMigrations(): void {
  const db = getDb();

  // Check if memories table has 'source' column
  const columns = db.prepare("PRAGMA table_info(memories)").all() as Array<{ name: string }>;
  const hasSource = columns.some((col) => col.name === "source");

  if (!hasSource && columns.length > 0) {
    // Table exists but lacks source column — add it
    db.exec(`ALTER TABLE memories ADD COLUMN source TEXT NOT NULL DEFAULT 'ai'`);
  }
}

export function initializeSchema(): void {
  const db = getDb();
  db.exec(SCHEMA_SQL);
  runMigrations();
}
