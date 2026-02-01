import { getDb, isTauriContext } from "./db";

export interface TestItem {
  id: number;
  content: string;
  created_at: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export async function initializeSchema(): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Test items table (existing)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS test_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Threads table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )
  `);

  // Messages table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT
    )
  `);

  // Settings table (for API keys)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index for faster message queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)
  `);
}

export async function createItem(content: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("INSERT INTO test_items (content) VALUES ($1)", [content]);
}

export async function getAllItems(): Promise<TestItem[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const result = await db.select<TestItem[]>(
    "SELECT id, content, created_at FROM test_items ORDER BY created_at DESC",
  );
  return result;
}

export async function deleteItem(id: number): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM test_items WHERE id = $1", [id]);
}

// Database introspection functions

export async function listTables(): Promise<string[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const result = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return result.map((row) => row.name);
}

export async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const db = await getDb();
  const result = await db.select<ColumnInfo[]>(
    `PRAGMA table_info(${tableName})`,
  );
  return result;
}

export async function getTableRows(
  tableName: string,
  limit: number = 100,
): Promise<Record<string, unknown>[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const db = await getDb();
  const result = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM ${tableName} LIMIT ${Math.min(limit, 1000)}`,
  );
  return result;
}

export async function getTableRowCount(tableName: string): Promise<number> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const db = await getDb();
  const result = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM ${tableName}`,
  );
  return result[0]?.count ?? 0;
}
