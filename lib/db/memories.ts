/**
 * Memory Database Operations
 *
 * CRUD operations for the unified memory.db — the same database that
 * the MCP server exposes to external tools (Claude Code, Cursor, Windsurf).
 * All in-app AI memory tools (remember/recall/forget) go through here.
 *
 * Schema matches server/db/schema.ts: versioned, typed, tagged, soft-deleted.
 */

import { getMemoryDb } from "./memory-db";
import { isTauriContext } from "@/lib/db";
import type { McpMemory, MemoryType } from "@/providers/memories-provider";

function generateId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get a specific memory by key
 */
export async function getMemory(
  key: string,
  scope: string = "global"
): Promise<McpMemory | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getMemoryDb();
  const rows = await db.select<McpMemory[]>(
    `SELECT * FROM memories
     WHERE key = $1 AND scope = $2 AND project_id IS NULL AND archived_at IS NULL`,
    [key, scope]
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Set a memory value (creates or updates with versioning)
 *
 * When a memory with the same key+scope already exists, bumps the version
 * and records history in memory_versions — matching MCP server behavior.
 */
export async function setMemory(
  key: string,
  content: string,
  scope: string = "global",
  type: MemoryType = "context",
  tags?: string[]
): Promise<McpMemory> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getMemoryDb();
  const now = new Date().toISOString();
  const tagsJson = tags && tags.length > 0 ? JSON.stringify(tags) : null;

  // Check if memory already exists
  const existing = await getMemory(key, scope);

  if (existing) {
    // Update existing: bump version, record history
    const newVersion = existing.version + 1;

    // Insert version history
    await db.execute(
      `INSERT INTO memory_versions (id, memory_id, content, version, changed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateId(), existing.id, existing.content, existing.version, "continuity-app", now]
    );

    // Update the memory
    await db.execute(
      `UPDATE memories SET content = $1, type = $2, tags = $3, version = $4, updated_at = $5
       WHERE id = $6`,
      [content, type, tagsJson, newVersion, now, existing.id]
    );
  } else {
    // Create new memory
    const id = generateId();

    await db.execute(
      `INSERT INTO memories (id, key, content, type, scope, project_id, tags, created_at, updated_at, version)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $7, 1)`,
      [id, key, content, type, scope, tagsJson, now]
    );

    // Record initial version
    await db.execute(
      `INSERT INTO memory_versions (id, memory_id, content, version, changed_by, created_at)
       VALUES ($1, $2, $3, 1, $4, $5)`,
      [generateId(), id, content, "continuity-app", now]
    );
  }

  const memory = await getMemory(key, scope);
  if (!memory) {
    throw new Error("Failed to create or update memory");
  }

  return memory;
}

/**
 * Get all non-archived memories.
 * When scope is provided, filters to that scope only.
 * When omitted, returns memories across ALL scopes (global + project).
 */
export async function getAllMemories(
  scope?: string
): Promise<McpMemory[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getMemoryDb();

  if (scope) {
    return db.select<McpMemory[]>(
      `SELECT * FROM memories
       WHERE scope = $1 AND archived_at IS NULL
       ORDER BY updated_at DESC`,
      [scope]
    );
  }

  return db.select<McpMemory[]>(
    `SELECT * FROM memories
     WHERE archived_at IS NULL
     ORDER BY updated_at DESC`
  );
}

/**
 * Soft-delete a memory (set archived_at, matching MCP server behavior)
 */
export async function deleteMemory(
  key: string,
  scope: string = "global"
): Promise<boolean> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getMemoryDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE memories SET archived_at = $1 WHERE key = $2 AND scope = $3 AND project_id IS NULL`,
    [now, key, scope]
  );
  return true;
}

/**
 * Search memories by pattern across key and content.
 * Searches ALL scopes (global + project) to find memories
 * written by any tool (in-app, Claude Code, Cursor, etc.)
 */
export async function searchMemories(
  pattern: string
): Promise<McpMemory[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getMemoryDb();
  return db.select<McpMemory[]>(
    `SELECT * FROM memories
     WHERE archived_at IS NULL
       AND (key LIKE $1 OR content LIKE $1)
     ORDER BY updated_at DESC`,
    [`%${pattern}%`]
  );
}
