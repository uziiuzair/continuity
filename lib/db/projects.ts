import { getDb, isTauriContext } from "../db";
import { Project } from "@/types/project";
import { Thread } from "@/types";

interface ProjectRow {
  id: string;
  name: string;
  custom_prompt: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface ThreadRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  project_id: string | null;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    customPrompt: row.custom_prompt || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
  };
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

function generateId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function createProject(
  name: string,
  customPrompt?: string
): Promise<Project> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.execute(
    "INSERT INTO projects (id, name, custom_prompt, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
    [id, name, customPrompt || null, now, now]
  );

  return {
    id,
    name,
    customPrompt,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ProjectRow[]>(
    "SELECT id, name, custom_prompt, created_at, updated_at, archived_at FROM projects WHERE id = $1",
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rowToProject(rows[0]);
}

export async function getAllProjects(): Promise<Project[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ProjectRow[]>(
    "SELECT id, name, custom_prompt, created_at, updated_at, archived_at FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC"
  );

  return rows.map(rowToProject);
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, "name" | "customPrompt">>
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const updates: string[] = ["updated_at = $1"];
  const params: (string | null)[] = [now];
  let paramIndex = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(data.name);
    paramIndex++;
  }

  if (data.customPrompt !== undefined) {
    updates.push(`custom_prompt = $${paramIndex}`);
    params.push(data.customPrompt || null);
    paramIndex++;
  }

  params.push(id);

  await db.execute(
    `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    params
  );
}

export async function archiveProject(id: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE projects SET archived_at = $1, updated_at = $2 WHERE id = $3",
    [now, now, id]
  );
}

export async function getProjectThreads(projectId: string): Promise<Thread[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<ThreadRow[]>(
    "SELECT id, title, created_at, updated_at, archived_at, project_id FROM threads WHERE project_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC",
    [projectId]
  );

  return rows.map(rowToThread);
}

export async function getProjectThreadCount(projectId: string): Promise<number> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const result = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM threads WHERE project_id = $1 AND archived_at IS NULL",
    [projectId]
  );

  return result[0]?.count ?? 0;
}

export async function updateProjectTimestamp(id: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute("UPDATE projects SET updated_at = $1 WHERE id = $2", [
    now,
    id,
  ]);
}
