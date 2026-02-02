/**
 * Database Block Operations
 *
 * CRUD operations for databases, columns, and rows tables.
 * Supports the database block with table, kanban, and tasks views.
 */

import { getDb, isTauriContext } from "../db";
import {
  Database,
  DatabaseColumn,
  DatabaseRow,
  DatabaseWithData,
  DatabaseColumnType,
  DatabaseColor,
  ColumnConfig,
  CellValue,
  SelectOption,
  DatabaseRaw,
  DatabaseColumnRaw,
  DatabaseRowRaw,
  databaseFromRaw,
  columnFromRaw,
  rowFromRaw,
} from "@/types/database";

// ============================================
// ID Generation
// ============================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// Database Operations
// ============================================

/**
 * Create a new database with a default "Name" column
 */
export async function createDatabase(
  threadId: string,
  title: string = "Untitled"
): Promise<DatabaseWithData> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const databaseId = generateId("db");
  const columnId = generateId("col");

  // Create database record
  await db.execute(
    `INSERT INTO databases (id, thread_id, title, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)`,
    [databaseId, threadId, title, now]
  );

  // Create default "Name" column
  await db.execute(
    `INSERT INTO database_columns (id, database_id, name, type, width, config, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
    [columnId, databaseId, "Name", "text", 200, null, 0, now]
  );

  return getDatabaseWithData(databaseId) as Promise<DatabaseWithData>;
}

/**
 * Get database by ID
 */
export async function getDatabaseById(id: string): Promise<Database | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<DatabaseRaw[]>(
    `SELECT id, thread_id, title, created_at, updated_at
     FROM databases WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return null;
  return databaseFromRaw(rows[0]);
}

/**
 * Get database with all columns and rows
 */
export async function getDatabaseWithData(
  id: string
): Promise<DatabaseWithData | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const database = await getDatabaseById(id);
  if (!database) return null;

  const columns = await getColumnsByDatabase(id);
  const rows = await getRowsByDatabase(id);

  return { database, columns, rows };
}

/**
 * Update database metadata
 */
export async function updateDatabase(
  id: string,
  updates: Partial<Pick<Database, "title">>
): Promise<Database | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const sets: string[] = ["updated_at = $1"];
  const params: (string | null)[] = [now];
  let paramIndex = 2;

  if (updates.title !== undefined) {
    sets.push(`title = $${paramIndex++}`);
    params.push(updates.title);
  }

  params.push(id);

  await db.execute(
    `UPDATE databases SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
    params
  );

  return getDatabaseById(id);
}

/**
 * Delete database and all related columns/rows (CASCADE)
 */
export async function deleteDatabase(id: string): Promise<boolean> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Delete rows first (no CASCADE in SQLite by default)
  await db.execute("DELETE FROM database_rows WHERE database_id = $1", [id]);
  // Delete columns
  await db.execute("DELETE FROM database_columns WHERE database_id = $1", [id]);
  // Delete database
  await db.execute("DELETE FROM databases WHERE id = $1", [id]);

  return true;
}

// ============================================
// Column Operations
// ============================================

/**
 * Get all columns for a database
 */
export async function getColumnsByDatabase(
  databaseId: string
): Promise<DatabaseColumn[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<DatabaseColumnRaw[]>(
    `SELECT id, database_id, name, type, width, config, sort_order, created_at, updated_at
     FROM database_columns WHERE database_id = $1 ORDER BY sort_order ASC`,
    [databaseId]
  );

  return rows.map(columnFromRaw);
}

/**
 * Create a new column
 */
export async function createColumn(
  databaseId: string,
  name: string,
  type: DatabaseColumnType,
  config?: ColumnConfig
): Promise<DatabaseColumn> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const columnId = generateId("col");

  // Get max sort order
  const maxOrderResult = await db.select<{ max_order: number | null }[]>(
    `SELECT MAX(sort_order) as max_order FROM database_columns WHERE database_id = $1`,
    [databaseId]
  );
  const sortOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

  // Set default width based on type
  const width = type === "status" ? 120 : 150;

  // Initialize config for select/multiselect/status types
  const finalConfig = (type === "select" || type === "multiselect" || type === "status")
    ? { options: [], ...config }
    : config;

  await db.execute(
    `INSERT INTO database_columns (id, database_id, name, type, width, config, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
    [
      columnId,
      databaseId,
      name,
      type,
      width,
      finalConfig ? JSON.stringify(finalConfig) : null,
      sortOrder,
      now,
    ]
  );

  const columns = await getColumnsByDatabase(databaseId);
  const created = columns.find((c) => c.id === columnId);
  if (!created) throw new Error("Failed to create column");
  return created;
}

/**
 * Update a column
 */
export async function updateColumn(
  id: string,
  updates: Partial<Pick<DatabaseColumn, "name" | "type" | "width" | "config">>
): Promise<DatabaseColumn | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const sets: string[] = ["updated_at = $1"];
  const params: (string | number | null)[] = [now];
  let paramIndex = 2;

  if (updates.name !== undefined) {
    sets.push(`name = $${paramIndex++}`);
    params.push(updates.name);
  }

  if (updates.type !== undefined) {
    sets.push(`type = $${paramIndex++}`);
    params.push(updates.type);
  }

  if (updates.width !== undefined) {
    sets.push(`width = $${paramIndex++}`);
    params.push(updates.width);
  }

  if (updates.config !== undefined) {
    sets.push(`config = $${paramIndex++}`);
    params.push(JSON.stringify(updates.config));
  }

  params.push(id);

  await db.execute(
    `UPDATE database_columns SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
    params
  );

  // Get the updated column
  const result = await db.select<DatabaseColumnRaw[]>(
    `SELECT id, database_id, name, type, width, config, sort_order, created_at, updated_at
     FROM database_columns WHERE id = $1`,
    [id]
  );

  if (result.length === 0) return null;
  return columnFromRaw(result[0]);
}

/**
 * Delete a column
 */
export async function deleteColumn(id: string): Promise<boolean> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM database_columns WHERE id = $1", [id]);
  return true;
}

/**
 * Reorder a column
 */
export async function reorderColumn(
  id: string,
  newSortOrder: number
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE database_columns SET sort_order = $1, updated_at = $2 WHERE id = $3`,
    [newSortOrder, now, id]
  );
}

// ============================================
// Row Operations
// ============================================

/**
 * Get all rows for a database
 */
export async function getRowsByDatabase(
  databaseId: string
): Promise<DatabaseRow[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<DatabaseRowRaw[]>(
    `SELECT id, database_id, "values", row_type, sort_order, created_at, updated_at
     FROM database_rows WHERE database_id = $1 ORDER BY sort_order ASC`,
    [databaseId]
  );

  return rows.map(rowFromRaw);
}

/**
 * Create a new row
 */
export async function createRow(
  databaseId: string,
  values?: Record<string, CellValue>
): Promise<DatabaseRow> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const rowId = generateId("row");

  // Get max sort order
  const maxOrderResult = await db.select<{ max_order: number | null }[]>(
    `SELECT MAX(sort_order) as max_order FROM database_rows WHERE database_id = $1`,
    [databaseId]
  );
  const sortOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

  await db.execute(
    `INSERT INTO database_rows (id, database_id, "values", row_type, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [rowId, databaseId, JSON.stringify(values || {}), null, sortOrder, now]
  );

  const rows = await getRowsByDatabase(databaseId);
  const created = rows.find((r) => r.id === rowId);
  if (!created) throw new Error("Failed to create row");
  return created;
}

/**
 * Update a single cell value
 */
export async function updateCell(
  rowId: string,
  columnId: string,
  value: CellValue
): Promise<DatabaseRow | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  // Get current values
  const result = await db.select<DatabaseRowRaw[]>(
    `SELECT id, database_id, "values", row_type, sort_order, created_at, updated_at
     FROM database_rows WHERE id = $1`,
    [rowId]
  );

  if (result.length === 0) return null;

  const currentValues = JSON.parse(result[0].values || "{}");
  const newValues = { ...currentValues, [columnId]: value };

  await db.execute(
    `UPDATE database_rows SET "values" = $1, updated_at = $2 WHERE id = $3`,
    [JSON.stringify(newValues), now, rowId]
  );

  const rows = await db.select<DatabaseRowRaw[]>(
    `SELECT id, database_id, "values", row_type, sort_order, created_at, updated_at
     FROM database_rows WHERE id = $1`,
    [rowId]
  );

  if (rows.length === 0) return null;
  return rowFromRaw(rows[0]);
}

/**
 * Update row metadata (type, sort order)
 */
export async function updateRow(
  id: string,
  updates: Partial<Pick<DatabaseRow, "values" | "rowType" | "sortOrder">>
): Promise<DatabaseRow | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const sets: string[] = ["updated_at = $1"];
  const params: (string | number | null)[] = [now];
  let paramIndex = 2;

  if (updates.values !== undefined) {
    sets.push(`"values" = $${paramIndex++}`);
    params.push(JSON.stringify(updates.values));
  }

  if (updates.rowType !== undefined) {
    sets.push(`row_type = $${paramIndex++}`);
    params.push(updates.rowType);
  }

  if (updates.sortOrder !== undefined) {
    sets.push(`sort_order = $${paramIndex++}`);
    params.push(updates.sortOrder);
  }

  params.push(id);

  await db.execute(
    `UPDATE database_rows SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
    params
  );

  const rows = await db.select<DatabaseRowRaw[]>(
    `SELECT id, database_id, "values", row_type, sort_order, created_at, updated_at
     FROM database_rows WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return null;
  return rowFromRaw(rows[0]);
}

/**
 * Delete a row
 */
export async function deleteRow(id: string): Promise<boolean> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM database_rows WHERE id = $1", [id]);
  return true;
}

/**
 * Reorder a row
 */
export async function reorderRow(
  id: string,
  newSortOrder: number
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE database_rows SET sort_order = $1, updated_at = $2 WHERE id = $3`,
    [newSortOrder, now, id]
  );
}

// ============================================
// Select Option Operations
// ============================================

/**
 * Add a select option to a column
 */
export async function addSelectOption(
  columnId: string,
  value: string,
  color: DatabaseColor = "blue"
): Promise<SelectOption> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Get current column config
  const columns = await db.select<DatabaseColumnRaw[]>(
    `SELECT id, database_id, name, type, width, config, sort_order, created_at, updated_at
     FROM database_columns WHERE id = $1`,
    [columnId]
  );

  if (columns.length === 0) {
    throw new Error("Column not found");
  }

  const column = columnFromRaw(columns[0]);
  if (column.type !== "select" && column.type !== "multiselect" && column.type !== "status") {
    throw new Error("Column is not a select, multiselect, or status type");
  }

  const newOption: SelectOption = {
    id: generateId("opt"),
    value,
    color,
  };

  const newConfig: ColumnConfig = {
    ...column.config,
    options: [...(column.config.options || []), newOption],
  };

  await updateColumn(columnId, { config: newConfig });

  return newOption;
}

/**
 * Update a select option
 */
export async function updateSelectOption(
  columnId: string,
  optionId: string,
  updates: Partial<Pick<SelectOption, "value" | "color">>
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Get current column config
  const columns = await db.select<DatabaseColumnRaw[]>(
    `SELECT id, database_id, name, type, width, config, sort_order, created_at, updated_at
     FROM database_columns WHERE id = $1`,
    [columnId]
  );

  if (columns.length === 0) {
    throw new Error("Column not found");
  }

  const column = columnFromRaw(columns[0]);
  const options = column.config.options || [];

  const newOptions = options.map((opt) =>
    opt.id === optionId ? { ...opt, ...updates } : opt
  );

  await updateColumn(columnId, { config: { ...column.config, options: newOptions } });
}

/**
 * Delete a select option
 */
export async function deleteSelectOption(
  columnId: string,
  optionId: string
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Get current column config
  const columns = await db.select<DatabaseColumnRaw[]>(
    `SELECT id, database_id, name, type, width, config, sort_order, created_at, updated_at
     FROM database_columns WHERE id = $1`,
    [columnId]
  );

  if (columns.length === 0) {
    throw new Error("Column not found");
  }

  const column = columnFromRaw(columns[0]);
  const options = column.config.options || [];

  const newOptions = options.filter((opt) => opt.id !== optionId);

  await updateColumn(columnId, { config: { ...column.config, options: newOptions } });
}

// ============================================
// Cross-Thread Queries
// ============================================

/**
 * Get all pending tasks (rows with row_type='task')
 * across all threads
 */
export async function getAllPendingTasks(): Promise<
  Array<DatabaseRow & { threadId: string; databaseTitle: string }>
> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  const rows = await db.select<
    (DatabaseRowRaw & { thread_id: string; database_title: string })[]
  >(
    `SELECT r.id, r.database_id, r."values", r.row_type, r.sort_order, r.created_at, r.updated_at,
            d.thread_id, d.title as database_title
     FROM database_rows r
     JOIN databases d ON r.database_id = d.id
     WHERE r.row_type = 'task'
     ORDER BY r.created_at DESC`
  );

  return rows.map((raw) => ({
    ...rowFromRaw(raw),
    threadId: raw.thread_id,
    databaseTitle: raw.database_title,
  }));
}

/**
 * Get databases for a thread
 */
export async function getDatabasesByThread(
  threadId: string
): Promise<Database[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<DatabaseRaw[]>(
    `SELECT id, thread_id, title, created_at, updated_at
     FROM databases WHERE thread_id = $1 ORDER BY created_at DESC`,
    [threadId]
  );

  return rows.map(databaseFromRaw);
}
