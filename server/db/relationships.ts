import { getDb } from "./connection.js";
import { MemoryLink, RelationshipType, Memory } from "../types.js";
import { randomUUID } from "crypto";

function generateId(): string {
  return `link-${randomUUID().slice(0, 8)}`;
}

export function linkMemories(params: {
  memory_id_a: string;
  memory_id_b: string;
  relationship_type?: RelationshipType;
}): MemoryLink {
  const db = getDb();
  const { memory_id_a, memory_id_b, relationship_type = "related" } = params;

  // Verify both memories exist
  const a = db.prepare("SELECT id FROM memories WHERE id = ?").get(memory_id_a);
  const b = db.prepare("SELECT id FROM memories WHERE id = ?").get(memory_id_b);
  if (!a) throw new Error(`Memory not found: ${memory_id_a}`);
  if (!b) throw new Error(`Memory not found: ${memory_id_b}`);

  const id = generateId();
  const now = new Date().toISOString();

  try {
    db.prepare(
      `INSERT INTO memory_links (id, memory_id_a, memory_id_b, relationship_type, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, memory_id_a, memory_id_b, relationship_type, now);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
      throw new Error(`Link already exists between ${memory_id_a} and ${memory_id_b} with type ${relationship_type}`);
    }
    throw err;
  }

  return db.prepare("SELECT * FROM memory_links WHERE id = ?").get(id) as MemoryLink;
}

export function getMemoryLinks(memoryId: string): Array<{
  link: MemoryLink;
  linked_memory: Memory;
}> {
  const db = getDb();

  const links = db
    .prepare(
      `SELECT ml.*, m.*,
              ml.id as link_id, ml.memory_id_a, ml.memory_id_b, ml.relationship_type, ml.created_at as link_created_at,
              m.id as mem_id, m.key, m.content, m.type, m.scope, m.project_id, m.tags, m.metadata,
              m.archived_at, m.created_at as mem_created_at, m.updated_at, m.version
       FROM memory_links ml
       JOIN memories m ON (
         CASE WHEN ml.memory_id_a = ? THEN ml.memory_id_b ELSE ml.memory_id_a END = m.id
       )
       WHERE (ml.memory_id_a = ? OR ml.memory_id_b = ?)
       AND m.archived_at IS NULL`
    )
    .all(memoryId, memoryId, memoryId) as Array<Record<string, unknown>>;

  return links.map((row) => ({
    link: {
      id: row.link_id as string,
      memory_id_a: row.memory_id_a as string,
      memory_id_b: row.memory_id_b as string,
      relationship_type: row.relationship_type as RelationshipType,
      created_at: row.link_created_at as string,
    },
    linked_memory: {
      id: row.mem_id as string,
      key: row.key as string,
      content: row.content as string,
      type: row.type as string,
      scope: row.scope as string,
      project_id: row.project_id as string | null,
      tags: row.tags as string | null,
      metadata: row.metadata as string | null,
      archived_at: row.archived_at as string | null,
      created_at: row.mem_created_at as string,
      updated_at: row.updated_at as string,
      version: row.version as number,
    } as Memory,
  }));
}
