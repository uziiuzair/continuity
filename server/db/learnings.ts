import { getDb } from "./connection.js";
import { Learning, SignalType, MemoryScope } from "../types.js";
import { randomUUID } from "crypto";

function generateId(): string {
  return `lrn-${randomUUID().slice(0, 8)}`;
}

/**
 * Record a new learning signal extracted from conversation.
 */
export function recordLearning(params: {
  signal_type: SignalType;
  observation: string;
  confidence?: number;
  scope?: MemoryScope;
  project_id?: string;
  source_thread_id?: string;
  source_message_id?: string;
}): Learning {
  const db = getDb();
  const {
    signal_type,
    observation,
    confidence = 0.5,
    scope = "global",
    project_id = null,
    source_thread_id = null,
    source_message_id = null,
  } = params;

  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO learnings (id, scope, project_id, signal_type, observation, confidence,
       source_thread_id, source_message_id, absorbed_into_narrative, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(id, scope, project_id, signal_type, observation, confidence, source_thread_id, source_message_id, now);

  return db.prepare("SELECT * FROM learnings WHERE id = ?").get(id) as Learning;
}

/**
 * Get all learnings not yet absorbed into a narrative synthesis.
 */
export function getUnabsorbedLearnings(
  scope: MemoryScope = "global",
  projectId?: string
): Learning[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM learnings
       WHERE absorbed_into_narrative = 0
         AND scope = ?
         AND COALESCE(project_id, '') = COALESCE(?, '')
       ORDER BY created_at ASC`
    )
    .all(scope, projectId || null) as Learning[];
}

/**
 * Mark learnings as absorbed into the narrative after synthesis.
 */
export function markAbsorbed(ids: string[]): number {
  if (ids.length === 0) return 0;

  const db = getDb();
  const placeholders = ids.map(() => "?").join(", ");
  const result = db
    .prepare(
      `UPDATE learnings SET absorbed_into_narrative = 1
       WHERE id IN (${placeholders})`
    )
    .run(...ids);

  return result.changes;
}

/**
 * Get all learnings for a scope (for display/debugging).
 */
export function getLearnings(
  scope: MemoryScope = "global",
  projectId?: string,
  limit: number = 50
): Learning[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM learnings
       WHERE scope = ? AND COALESCE(project_id, '') = COALESCE(?, '')
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(scope, projectId || null, limit) as Learning[];
}

/**
 * Count unabsorbed learnings (used to trigger synthesis threshold).
 */
export function countUnabsorbedLearnings(
  scope: MemoryScope = "global",
  projectId?: string
): number {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM learnings
       WHERE absorbed_into_narrative = 0
         AND scope = ?
         AND COALESCE(project_id, '') = COALESCE(?, '')`
    )
    .get(scope, projectId || null) as { count: number };

  return row.count;
}
