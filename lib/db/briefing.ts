/**
 * Briefing Database Queries
 *
 * Query functions for the Home Briefing View.
 * Fetches threads with work state and tasks from database_rows.
 */

import { getDb, isTauriContext } from "../db";
import {
  ActiveThread,
  BriefingTask,
  TasksByDay,
  ThreadWithWorkState,
} from "@/types/briefing";
import { WorkState } from "@/types/work-state";
import {
  DatabaseRow,
  DatabaseColumn,
  DatabaseRowRaw,
  rowFromRaw,
  columnFromRaw,
  DatabaseColumnRaw,
} from "@/types/database";

interface ThreadRowWithWorkState {
  id: string;
  title: string;
  updated_at: string;
  work_state: string | null;
}

/**
 * Get threads with work state, ordered by recency
 */
export async function getActiveThreadsForBriefing(
  limit = 3
): Promise<ActiveThread[]> {
  if (!isTauriContext()) {
    return [];
  }

  const db = await getDb();
  const rows = await db.select<ThreadRowWithWorkState[]>(
    `SELECT id, title, updated_at, work_state
     FROM threads
     WHERE archived_at IS NULL
     ORDER BY updated_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((row) => {
    let workState: WorkState | null = null;
    if (row.work_state) {
      try {
        workState = JSON.parse(row.work_state);
      } catch {
        // Invalid JSON, ignore
      }
    }

    return {
      id: row.id,
      title: row.title,
      objective: workState?.objective || undefined,
      nextAction: workState?.nextAction || undefined,
      updatedAt: new Date(row.updated_at),
    };
  });
}

/**
 * Get count of threads (for onboarding detection)
 */
export async function getThreadCount(): Promise<number> {
  if (!isTauriContext()) {
    return 0;
  }

  const db = await getDb();
  const result = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM threads WHERE archived_at IS NULL`
  );

  return result[0]?.count ?? 0;
}

/**
 * Find a date column in a database's columns
 */
function findDateColumn(columns: DatabaseColumn[]): DatabaseColumn | null {
  return columns.find((col) => col.type === "date") || null;
}

/**
 * Find a status column in a database's columns
 */
function findStatusColumn(columns: DatabaseColumn[]): DatabaseColumn | null {
  return (
    columns.find((col) => col.type === "status") ||
    columns.find(
      (col) =>
        col.type === "select" && col.name.toLowerCase().includes("status")
    ) ||
    null
  );
}

/**
 * Find a name/title column in a database's columns
 */
function findNameColumn(columns: DatabaseColumn[]): DatabaseColumn | null {
  // First try to find a column named "Name", "Task", or "Title"
  const nameColumns = ["name", "task", "title"];
  for (const name of nameColumns) {
    const col = columns.find((c) => c.name.toLowerCase() === name);
    if (col) return col;
  }

  // Fall back to first text column
  return columns.find((col) => col.type === "text") || null;
}

/**
 * Check if a status value indicates "done"
 */
function isDoneStatus(
  statusValue: string | null,
  statusColumn: DatabaseColumn | null
): boolean {
  if (!statusValue || !statusColumn) return false;

  // Get the option value (not ID)
  const options = statusColumn.config?.options || [];
  const option = options.find((opt) => opt.id === statusValue);
  const value = option?.value || statusValue;

  // Check common "done" values
  const doneValues = ["done", "complete", "completed", "finished", "closed"];
  return doneValues.includes(value.toLowerCase());
}

interface TaskRowWithMetadata extends DatabaseRowRaw {
  thread_id: string;
  database_title: string;
  database_id: string;
}

/**
 * Get all pending tasks from database_rows (where row_type='task')
 * bucketed by due date
 */
export async function getTasksByDay(): Promise<TasksByDay> {
  if (!isTauriContext()) {
    return {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      unscheduled: [],
    };
  }

  const db = await getDb();

  // Get all task rows with their database info
  const rows = await db.select<TaskRowWithMetadata[]>(
    `SELECT r.id, r.database_id, r."values", r.row_type, r.sort_order, r.created_at, r.updated_at,
            d.thread_id, d.title as database_title
     FROM database_rows r
     JOIN databases d ON r.database_id = d.id
     WHERE r.row_type = 'task'
     ORDER BY r.created_at DESC`
  );

  if (rows.length === 0) {
    return {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      unscheduled: [],
    };
  }

  // Get unique database IDs to fetch their columns
  const databaseIds = [...new Set(rows.map((r) => r.database_id))];

  // Fetch columns for each database
  const columnsByDatabase: Record<string, DatabaseColumn[]> = {};
  for (const dbId of databaseIds) {
    const colRows = await db.select<DatabaseColumnRaw[]>(
      `SELECT id, database_id, name, type, width, config, sort_order, created_at, updated_at
       FROM database_columns WHERE database_id = $1 ORDER BY sort_order ASC`,
      [dbId]
    );
    columnsByDatabase[dbId] = colRows.map(columnFromRaw);
  }

  // Parse tasks with their column metadata
  const tasks: BriefingTask[] = rows.map((raw) => {
    const row = rowFromRaw(raw);
    const columns = columnsByDatabase[raw.database_id] || [];

    const dateColumn = findDateColumn(columns);
    const statusColumn = findStatusColumn(columns);
    const nameColumn = findNameColumn(columns);

    // Get the title from the name column
    const title = nameColumn
      ? (row.values[nameColumn.id] as string) || "Untitled"
      : "Untitled";

    // Get the date value
    let dueDate: Date | undefined;
    if (dateColumn && row.values[dateColumn.id]) {
      const dateValue = row.values[dateColumn.id] as string;
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
      }
    }

    // Get status
    const statusValue = statusColumn
      ? (row.values[statusColumn.id] as string | null)
      : null;
    const statusOption = statusColumn?.config?.options?.find(
      (opt) => opt.id === statusValue
    );
    const status = statusOption?.value || undefined;
    const isDone = isDoneStatus(statusValue, statusColumn);

    return {
      id: row.id,
      title,
      status,
      isDone,
      dueDate,
      threadId: raw.thread_id,
      databaseTitle: raw.database_title,
    };
  });

  // Filter out done tasks
  const pendingTasks = tasks.filter((t) => !t.isDone);

  // Bucket by date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const result: TasksByDay = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    unscheduled: [],
  };

  for (const task of pendingTasks) {
    if (!task.dueDate) {
      result.unscheduled.push(task);
    } else if (task.dueDate < today) {
      result.overdue.push(task);
    } else if (task.dueDate >= today && task.dueDate < tomorrow) {
      result.today.push(task);
    } else if (task.dueDate >= tomorrow && task.dueDate < dayAfterTomorrow) {
      result.tomorrow.push(task);
    } else if (task.dueDate >= dayAfterTomorrow && task.dueDate <= endOfWeek) {
      result.thisWeek.push(task);
    }
    // Tasks beyond this week are not shown in the briefing
  }

  // Sort each bucket by due date (earliest first)
  const sortByDate = (a: BriefingTask, b: BriefingTask) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  };

  result.overdue.sort(sortByDate);
  result.today.sort(sortByDate);
  result.tomorrow.sort(sortByDate);
  result.thisWeek.sort(sortByDate);

  return result;
}

/**
 * Get the total count of pending tasks
 */
export async function getPendingTaskCount(): Promise<number> {
  if (!isTauriContext()) {
    return 0;
  }

  const db = await getDb();
  const result = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM database_rows WHERE row_type = 'task'`
  );

  return result[0]?.count ?? 0;
}
