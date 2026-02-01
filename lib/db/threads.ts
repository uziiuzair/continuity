import { getDb, isTauriContext } from "../db";
import { Thread } from "@/types";

interface ThreadRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

function rowToThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
  };
}

export async function createThread(title: string): Promise<Thread> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.execute(
    "INSERT INTO threads (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)",
    [id, title, now, now]
  );

  return {
    id,
    title,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function getAllThreads(): Promise<Thread[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ThreadRow[]>(
    "SELECT id, title, created_at, updated_at, archived_at FROM threads WHERE archived_at IS NULL ORDER BY updated_at DESC"
  );

  return rows.map(rowToThread);
}

export async function getThread(id: string): Promise<Thread | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ThreadRow[]>(
    "SELECT id, title, created_at, updated_at, archived_at FROM threads WHERE id = $1",
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rowToThread(rows[0]);
}

export async function updateThread(id: string, title: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE threads SET title = $1, updated_at = $2 WHERE id = $3",
    [title, now, id]
  );
}

export async function archiveThread(id: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE threads SET archived_at = $1, updated_at = $2 WHERE id = $3",
    [now, now, id]
  );
}

export async function updateThreadTimestamp(id: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute("UPDATE threads SET updated_at = $1 WHERE id = $2", [
    now,
    id,
  ]);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
