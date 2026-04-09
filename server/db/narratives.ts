import { getDb } from "./connection.js";
import { Narrative, MemoryScope } from "../types.js";
import { randomUUID } from "crypto";

function generateId(): string {
  return `nar-${randomUUID().slice(0, 8)}`;
}

/**
 * Get the current narrative for a scope (global or project-specific).
 * Returns null if no narrative exists yet.
 */
export function getNarrative(
  scope: MemoryScope = "global",
  projectId?: string
): Narrative | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM narratives
       WHERE scope = ? AND COALESCE(project_id, '') = COALESCE(?, '')
       ORDER BY version DESC LIMIT 1`
    )
    .get(scope, projectId || null) as Narrative | undefined;

  return row || null;
}

/**
 * Save (upsert) a narrative. If one exists for the scope+project, increment version.
 */
export function saveNarrative(params: {
  scope?: MemoryScope;
  project_id?: string;
  content: string;
  sections: string;
  confidence: number;
  memory_snapshot_hash?: string;
}): Narrative {
  const db = getDb();
  const {
    scope = "global",
    project_id = null,
    content,
    sections,
    confidence,
    memory_snapshot_hash = null,
  } = params;

  const now = new Date().toISOString();

  // Check if narrative already exists for this scope+project
  const existing = db
    .prepare(
      `SELECT id, version FROM narratives
       WHERE scope = ? AND COALESCE(project_id, '') = COALESCE(?, '')`
    )
    .get(scope, project_id) as { id: string; version: number } | undefined;

  if (existing) {
    const newVersion = existing.version + 1;
    db.prepare(
      `UPDATE narratives
       SET content = ?, sections = ?, version = ?, confidence = ?,
           last_synthesized_at = ?, memory_snapshot_hash = ?, updated_at = ?
       WHERE id = ?`
    ).run(content, sections, newVersion, confidence, now, memory_snapshot_hash, now, existing.id);

    return db.prepare("SELECT * FROM narratives WHERE id = ?").get(existing.id) as Narrative;
  }

  // Create new narrative
  const id = generateId();
  db.prepare(
    `INSERT INTO narratives (id, scope, project_id, content, sections, version, confidence,
       last_synthesized_at, memory_snapshot_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
  ).run(id, scope, project_id, content, sections, confidence, now, memory_snapshot_hash, now, now);

  return db.prepare("SELECT * FROM narratives WHERE id = ?").get(id) as Narrative;
}

/**
 * Find narratives that are stale (older than maxAgeHours) and have new data.
 */
export function getStaleNarratives(maxAgeHours: number = 6): Narrative[] {
  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

  return db
    .prepare(
      `SELECT * FROM narratives
       WHERE last_synthesized_at < ?`
    )
    .all(cutoff) as Narrative[];
}

/**
 * Get all narratives (for app-side consumption).
 */
export function getAllNarratives(): Narrative[] {
  const db = getDb();
  return db.prepare("SELECT * FROM narratives ORDER BY scope, project_id").all() as Narrative[];
}
