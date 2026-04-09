/**
 * Shared Memory Database Connection
 *
 * Single connection module for memory.db — used by both the AI memory tools
 * and the Memories UI provider. This ensures all in-app memory operations
 * hit the same database that the MCP server uses externally.
 *
 * Database location: ~/Library/Application Support/com.ooozzy.continuity/memory.db
 * (The Tauri SQL plugin resolves "sqlite:memory.db" relative to the app config dir)
 */

import { isTauriContext } from "@/lib/db";

let memoryDb: import("@tauri-apps/plugin-sql").default | null = null;

/**
 * Get a connection to the shared memory.db
 * Used by both lib/db/memories.ts (AI tools) and memories-provider.tsx (UI)
 */
export async function getMemoryDb() {
  if (!isTauriContext()) {
    throw new Error("Memory database requires Tauri context");
  }

  if (!memoryDb) {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    memoryDb = await Database.load("sqlite:memory.db");
  }
  return memoryDb;
}

/**
 * Bootstrap the memory.db schema
 *
 * Creates all tables if they don't exist. This mirrors the MCP server's schema
 * (server/db/schema.ts) so the app works even if the MCP server hasn't run yet.
 * Safe to call multiple times — all statements use CREATE IF NOT EXISTS.
 */
export async function ensureMemorySchema(): Promise<void> {
  const db = await getMemoryDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )
  `);

  await db.execute(`
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
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS memory_versions (
      id TEXT PRIMARY KEY,
      memory_id TEXT NOT NULL REFERENCES memories(id),
      content TEXT NOT NULL,
      version INTEGER NOT NULL,
      changed_by TEXT,
      change_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS memory_links (
      id TEXT PRIMARY KEY,
      memory_id_a TEXT NOT NULL REFERENCES memories(id),
      memory_id_b TEXT NOT NULL REFERENCES memories(id),
      relationship_type TEXT NOT NULL DEFAULT 'related'
        CHECK (relationship_type IN ('related', 'depends_on', 'contradicts', 'supersedes', 'implements')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(memory_id_a, memory_id_b, relationship_type)
    )
  `);

  // Narratives table — synthesized AI understanding
  await db.execute(`
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
    )
  `);

  // Learnings table — signals extracted from conversations
  await db.execute(`
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
    )
  `);

  // Indexes for fast lookups
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memories_key_scope ON memories(key, scope, project_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memory_versions_memory_id ON memory_versions(memory_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memory_links_a ON memory_links(memory_id_a)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_memory_links_b ON memory_links(memory_id_b)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_narratives_scope ON narratives(scope, project_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_learnings_scope ON learnings(scope, project_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_learnings_unabsorbed ON learnings(absorbed_into_narrative)");

  // Migration: add source column to existing memories table if missing
  try {
    await db.execute(`ALTER TABLE memories ADD COLUMN source TEXT NOT NULL DEFAULT 'ai'`);
  } catch {
    // Column already exists — safe to ignore
  }
}
