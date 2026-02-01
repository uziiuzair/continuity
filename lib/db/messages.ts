import { getDb, isTauriContext } from "../db";
import { Message, MessageMetadata } from "@/types";

interface MessageRow {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  metadata: string | null;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at),
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

export async function createMessage(
  threadId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: MessageMetadata
): Promise<Message> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await db.execute(
    "INSERT INTO messages (id, thread_id, role, content, created_at, metadata) VALUES ($1, $2, $3, $4, $5, $6)",
    [id, threadId, role, content, now, metadataJson]
  );

  return {
    id,
    threadId,
    role,
    content,
    createdAt: new Date(now),
    metadata,
  };
}

export async function getMessagesByThread(threadId: string): Promise<Message[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<MessageRow[]>(
    "SELECT id, thread_id, role, content, created_at, metadata FROM messages WHERE thread_id = $1 ORDER BY created_at ASC",
    [threadId]
  );

  return rows.map(rowToMessage);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
