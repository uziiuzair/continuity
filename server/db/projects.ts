import { getDb } from "./connection.js";
import { Project, Memory } from "../types.js";
import { randomUUID } from "crypto";

function generateId(): string {
  return `proj-${randomUUID().slice(0, 8)}`;
}

export function createProject(params: {
  name: string;
  description?: string;
  path?: string;
}): Project {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO projects (id, name, description, path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, params.name, params.description || null, params.path || null, now, now);

  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project;
}

export function listProjects(): Project[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC")
    .all() as Project[];
}

export function getProject(
  id: string,
  includeMemories?: boolean
): { project: Project; memories?: Memory[] } | null {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Project | undefined;

  if (!project) return null;

  if (includeMemories) {
    const memories = db
      .prepare("SELECT * FROM memories WHERE project_id = ? AND archived_at IS NULL ORDER BY updated_at DESC")
      .all(id) as Memory[];
    return { project, memories };
  }

  return { project };
}
