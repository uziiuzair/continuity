import { getDb, isTauriContext } from "./db";

export interface TestItem {
  id: number;
  content: string;
  created_at: string;
}

export async function initializeSchema(): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS test_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
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
