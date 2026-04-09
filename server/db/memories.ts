import { getDb } from "./connection.js";
import { Memory, MemoryType, MemoryScope, MemorySource } from "../types.js";
import { randomUUID } from "crypto";

function generateId(): string {
  return `mem-${randomUUID().slice(0, 8)}`;
}

function generateVersionId(): string {
  return `ver-${randomUUID().slice(0, 8)}`;
}

export function writeMemory(params: {
  key: string;
  content: string;
  type?: MemoryType;
  scope?: MemoryScope;
  project_id?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  source?: MemorySource;
  changed_by?: string;
}): Memory {
  const db = getDb();
  const {
    key,
    content,
    type = "context",
    scope = "global",
    project_id = null,
    tags,
    metadata,
    source = "ai",
    changed_by,
  } = params;

  const now = new Date().toISOString();
  const tagsJson = tags ? JSON.stringify(tags) : null;
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  // Check if memory already exists (upsert)
  const existing = db
    .prepare(
      `SELECT id, version FROM memories
       WHERE key = ? AND scope = ? AND COALESCE(project_id, '') = COALESCE(?, '')`
    )
    .get(key, scope, project_id) as { id: string; version: number } | undefined;

  if (existing) {
    const newVersion = existing.version + 1;
    db.prepare(
      `UPDATE memories SET content = ?, type = ?, tags = ?, metadata = ?, source = ?,
       updated_at = ?, version = ?, archived_at = NULL
       WHERE id = ?`
    ).run(content, type, tagsJson, metadataJson, source, now, newVersion, existing.id);

    // Record version
    db.prepare(
      `INSERT INTO memory_versions (id, memory_id, content, version, changed_by, change_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(generateVersionId(), existing.id, content, newVersion, changed_by || null, "Updated via memory_write", now);

    return db.prepare("SELECT * FROM memories WHERE id = ?").get(existing.id) as Memory;
  }

  // Create new
  const id = generateId();
  db.prepare(
    `INSERT INTO memories (id, key, content, type, scope, project_id, tags, metadata, source, created_at, updated_at, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(id, key, content, type, scope, project_id, tagsJson, metadataJson, source, now, now);

  // Record initial version
  db.prepare(
    `INSERT INTO memory_versions (id, memory_id, content, version, changed_by, change_reason, created_at)
     VALUES (?, ?, ?, 1, ?, ?, ?)`
  ).run(generateVersionId(), id, content, changed_by || null, "Initial creation", now);

  return db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Memory;
}

export function readMemory(params: {
  id?: string;
  key?: string;
  scope?: MemoryScope;
  project_id?: string;
}): Memory | null {
  const db = getDb();
  const { id, key, scope, project_id } = params;

  if (id) {
    return (db.prepare("SELECT * FROM memories WHERE id = ? AND archived_at IS NULL").get(id) as Memory) || null;
  }

  if (key) {
    const s = scope || "global";
    return (
      db
        .prepare(
          `SELECT * FROM memories WHERE key = ? AND scope = ? AND COALESCE(project_id, '') = COALESCE(?, '') AND archived_at IS NULL`
        )
        .get(key, s, project_id || null) as Memory
    ) || null;
  }

  return null;
}

export function updateMemory(params: {
  id: string;
  content?: string;
  type?: MemoryType;
  tags?: string[];
  metadata?: Record<string, unknown>;
  change_reason?: string;
  changed_by?: string;
}): Memory {
  const db = getDb();
  const { id, content, type, tags, metadata, change_reason, changed_by } = params;

  const existing = db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Memory | undefined;
  if (!existing) {
    throw new Error(`Memory not found: ${id}`);
  }

  const now = new Date().toISOString();
  const updates: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (content !== undefined) {
    updates.push("content = ?");
    values.push(content);
  }
  if (type !== undefined) {
    updates.push("type = ?");
    values.push(type);
  }
  if (tags !== undefined) {
    updates.push("tags = ?");
    values.push(JSON.stringify(tags));
  }
  if (metadata !== undefined) {
    updates.push("metadata = ?");
    values.push(JSON.stringify(metadata));
  }

  const newVersion = existing.version + 1;
  updates.push("version = ?");
  values.push(newVersion);
  values.push(id);

  db.prepare(`UPDATE memories SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  // Record version
  const versionContent = content || existing.content;
  db.prepare(
    `INSERT INTO memory_versions (id, memory_id, content, version, changed_by, change_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(generateVersionId(), id, versionContent, newVersion, changed_by || null, change_reason || null, now);

  return db.prepare("SELECT * FROM memories WHERE id = ?").get(id) as Memory;
}

export function deleteMemory(id: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare("UPDATE memories SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL").run(now, now, id);
  return result.changes > 0;
}

export function bulkImportMemories(
  memories: Array<{
    key: string;
    content: string;
    type?: MemoryType;
    scope?: MemoryScope;
    project_id?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }>,
  changed_by?: string
): Memory[] {
  const db = getDb();
  const results: Memory[] = [];

  const transaction = db.transaction(() => {
    for (const mem of memories) {
      const result = writeMemory({ ...mem, changed_by });
      results.push(result);
    }
  });

  transaction();
  return results;
}
