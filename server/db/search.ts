import { getDb } from "./connection.js";
import { Memory, MemoryScope, MemoryType } from "../types.js";

export function searchMemories(params: {
  query: string;
  scope?: MemoryScope;
  project_id?: string;
  type?: MemoryType;
  tags?: string[];
  limit?: number;
}): Memory[] {
  const db = getDb();
  const { query, scope, project_id, type, tags, limit = 20 } = params;

  const conditions: string[] = ["archived_at IS NULL"];
  const values: unknown[] = [];

  // Search across key, content, and tags
  const searchPattern = `%${query}%`;
  conditions.push("(key LIKE ? OR content LIKE ? OR tags LIKE ?)");
  values.push(searchPattern, searchPattern, searchPattern);

  if (scope) {
    conditions.push("scope = ?");
    values.push(scope);
  }

  if (project_id) {
    conditions.push("project_id = ?");
    values.push(project_id);
  }

  if (type) {
    conditions.push("type = ?");
    values.push(type);
  }

  if (tags && tags.length > 0) {
    // Match any of the provided tags within the JSON array
    const tagConditions = tags.map(() => "tags LIKE ?");
    conditions.push(`(${tagConditions.join(" OR ")})`);
    for (const tag of tags) {
      values.push(`%"${tag}"%`);
    }
  }

  values.push(limit);

  const sql = `SELECT * FROM memories WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`;
  return db.prepare(sql).all(...values) as Memory[];
}
