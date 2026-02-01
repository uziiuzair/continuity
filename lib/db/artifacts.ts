/**
 * Artifact Database Operations
 *
 * CRUD operations for the artifacts table - structured items like
 * tasks, notes, and decisions that the AI extracts from conversations.
 */

import { getDb, isTauriContext } from "../db";
import { Artifact, ArtifactType, ArtifactStatus, ArtifactPriority } from "@/types";

// Generate a unique ID
function generateId(): string {
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ArtifactRow {
  id: string;
  thread_id: string;
  type: string;
  title: string;
  content: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  source_message_id: string | null;
}

function rowToArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    threadId: row.thread_id,
    type: row.type as ArtifactType,
    title: row.title,
    content: row.content ? JSON.parse(row.content) : undefined,
    status: row.status as ArtifactStatus,
    priority: row.priority as ArtifactPriority | undefined,
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sourceMessageId: row.source_message_id || undefined,
  };
}

export interface NewArtifact {
  threadId: string;
  type: ArtifactType;
  title: string;
  content?: unknown;
  priority?: ArtifactPriority;
  dueDate?: Date;
  sourceMessageId?: string;
}

/**
 * Create a new artifact
 */
export async function createArtifact(artifact: NewArtifact): Promise<Artifact> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const id = generateId();

  await db.execute(
    `INSERT INTO artifacts (id, thread_id, type, title, content, status, priority, due_date, created_at, updated_at, source_message_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)`,
    [
      id,
      artifact.threadId,
      artifact.type,
      artifact.title,
      artifact.content ? JSON.stringify(artifact.content) : null,
      "active",
      artifact.priority || null,
      artifact.dueDate?.toISOString() || null,
      now,
      artifact.sourceMessageId || null,
    ]
  );

  const created = await getArtifactById(id);
  if (!created) {
    throw new Error("Failed to create artifact");
  }

  return created;
}

/**
 * Get an artifact by ID
 */
export async function getArtifactById(id: string): Promise<Artifact | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ArtifactRow[]>(
    `SELECT id, thread_id, type, title, content, status, priority, due_date, created_at, updated_at, source_message_id
     FROM artifacts WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rowToArtifact(rows[0]);
}

/**
 * Get all artifacts for a thread
 */
export async function getArtifactsByThread(
  threadId: string,
  type?: ArtifactType,
  status?: ArtifactStatus
): Promise<Artifact[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  let query = `SELECT id, thread_id, type, title, content, status, priority, due_date, created_at, updated_at, source_message_id
               FROM artifacts WHERE thread_id = $1`;
  const params: (string | undefined)[] = [threadId];

  if (type) {
    query += ` AND type = $${params.length + 1}`;
    params.push(type);
  }

  if (status) {
    query += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  const rows = await db.select<ArtifactRow[]>(query, params);
  return rows.map(rowToArtifact);
}

/**
 * Get tasks (convenience method)
 */
export async function getTasks(
  threadId: string,
  status?: ArtifactStatus
): Promise<Artifact[]> {
  return getArtifactsByThread(threadId, "task", status);
}

/**
 * Update an artifact
 */
export async function updateArtifact(
  id: string,
  updates: Partial<Pick<Artifact, "title" | "content" | "status" | "priority" | "dueDate">>
): Promise<Artifact | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  // Build update query dynamically
  const sets: string[] = ["updated_at = $1"];
  const params: (string | null)[] = [now];
  let paramIndex = 2;

  if (updates.title !== undefined) {
    sets.push(`title = $${paramIndex++}`);
    params.push(updates.title);
  }

  if (updates.content !== undefined) {
    sets.push(`content = $${paramIndex++}`);
    params.push(JSON.stringify(updates.content));
  }

  if (updates.status !== undefined) {
    sets.push(`status = $${paramIndex++}`);
    params.push(updates.status);
  }

  if (updates.priority !== undefined) {
    sets.push(`priority = $${paramIndex++}`);
    params.push(updates.priority || null);
  }

  if (updates.dueDate !== undefined) {
    sets.push(`due_date = $${paramIndex++}`);
    params.push(updates.dueDate?.toISOString() || null);
  }

  params.push(id);

  await db.execute(
    `UPDATE artifacts SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
    params
  );

  return getArtifactById(id);
}

/**
 * Mark a task as completed
 */
export async function completeTask(id: string): Promise<Artifact | null> {
  return updateArtifact(id, { status: "completed" });
}

/**
 * Archive an artifact (soft delete)
 */
export async function archiveArtifact(id: string): Promise<Artifact | null> {
  return updateArtifact(id, { status: "archived" });
}

/**
 * Delete an artifact (hard delete)
 */
export async function deleteArtifact(id: string): Promise<boolean> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM artifacts WHERE id = $1", [id]);
  return true;
}

/**
 * Get all active tasks across all threads
 */
export async function getAllActiveTasks(): Promise<Artifact[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ArtifactRow[]>(
    `SELECT id, thread_id, type, title, content, status, priority, due_date, created_at, updated_at, source_message_id
     FROM artifacts WHERE type = 'task' AND status = 'active'
     ORDER BY
       CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
       due_date ASC NULLS LAST,
       created_at DESC`
  );

  return rows.map(rowToArtifact);
}
