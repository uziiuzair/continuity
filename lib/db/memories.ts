/**
 * Memory Database Operations
 *
 * CRUD operations for the memories table - persistent key-value storage
 * that the AI can use to remember information across conversations.
 */

import { getDb, isTauriContext } from "../db";
import { Memory } from "@/types";

// Generate a unique ID
function generateId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get a specific memory by key
 */
export async function getMemory(
  key: string,
  scope: string = "global"
): Promise<Memory | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<
    {
      id: string;
      key: string;
      value: string;
      scope: string;
      created_at: string;
      updated_at: string;
    }[]
  >(
    "SELECT id, key, value, scope, created_at, updated_at FROM memories WHERE key = $1 AND scope = $2",
    [key, scope]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    scope: row.scope,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Set a memory value (creates or updates)
 */
export async function setMemory(
  key: string,
  value: string,
  scope: string = "global"
): Promise<Memory> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const id = generateId();

  // Use UPSERT to create or update
  await db.execute(
    `INSERT INTO memories (id, key, value, scope, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT(key, scope) DO UPDATE SET
       value = $3,
       updated_at = $5`,
    [id, key, value, scope, now]
  );

  // Fetch the memory to return (could be the new one or updated existing)
  const memory = await getMemory(key, scope);
  if (!memory) {
    throw new Error("Failed to create or update memory");
  }

  return memory;
}

/**
 * Get all memories for a given scope
 */
export async function getAllMemories(
  scope: string = "global"
): Promise<Memory[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<
    {
      id: string;
      key: string;
      value: string;
      scope: string;
      created_at: string;
      updated_at: string;
    }[]
  >(
    "SELECT id, key, value, scope, created_at, updated_at FROM memories WHERE scope = $1 ORDER BY key ASC",
    [scope]
  );

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    scope: row.scope,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Delete a memory by key
 */
export async function deleteMemory(
  key: string,
  scope: string = "global"
): Promise<boolean> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute(
    "DELETE FROM memories WHERE key = $1 AND scope = $2",
    [key, scope]
  );

  // SQLite doesn't return affected rows easily, so we just return true
  return true;
}

/**
 * Search memories by key pattern
 */
export async function searchMemories(
  pattern: string,
  scope: string = "global"
): Promise<Memory[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  // Use LIKE for pattern matching with % wildcards
  const rows = await db.select<
    {
      id: string;
      key: string;
      value: string;
      scope: string;
      created_at: string;
      updated_at: string;
    }[]
  >(
    "SELECT id, key, value, scope, created_at, updated_at FROM memories WHERE scope = $1 AND (key LIKE $2 OR value LIKE $2) ORDER BY key ASC",
    [scope, `%${pattern}%`]
  );

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    scope: row.scope,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}
