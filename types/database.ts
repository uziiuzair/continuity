/**
 * Database Types for SQLite Persistence
 *
 * These types represent the database entities stored in SQLite,
 * separate from the in-memory block types used by the editor.
 */

// Column types supported by the database
export type DatabaseColumnType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "time"
  | "status";

// View types for the database block
export type DatabaseViewType = "table" | "kanban" | "tasks";

// Colors for select options and tags
export type DatabaseColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

// Select option for select-type columns
export interface SelectOption {
  id: string;
  value: string;
  color: DatabaseColor;
}

// Column configuration (stored as JSON in SQLite)
export interface ColumnConfig {
  options?: SelectOption[];
}

// Cell value types
export type CellValue =
  | string // text, select (option id), date (ISO string), time
  | number // number
  | boolean // (legacy checkbox support)
  | string[] // multiselect (array of option ids)
  | null;

// ============================================
// SQLite Entity Types
// ============================================

/**
 * Database entity - metadata for a database instance
 */
export interface Database {
  id: string;
  threadId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DatabaseColumn entity - column definition (schema)
 */
export interface DatabaseColumn {
  id: string;
  databaseId: string;
  name: string;
  type: DatabaseColumnType;
  width: number;
  config: ColumnConfig;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DatabaseRow entity - actual data record
 */
export interface DatabaseRow {
  id: string;
  databaseId: string;
  values: Record<string, CellValue>;
  rowType: "task" | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Database with related data
// ============================================

export interface DatabaseWithData {
  database: Database;
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
}

// ============================================
// Block Props (stored in editor block)
// ============================================

export interface DatabaseBlockProps {
  databaseId: string;
  viewType: DatabaseViewType;
  kanbanGroupByColumnId?: string;
}

// ============================================
// SQLite Raw Row Types (for DB queries)
// ============================================

export interface DatabaseRaw {
  id: string;
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseColumnRaw {
  id: string;
  database_id: string;
  name: string;
  type: string;
  width: number;
  config: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRowRaw {
  id: string;
  database_id: string;
  values: string;
  row_type: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Conversion helpers
// ============================================

export function databaseFromRaw(raw: DatabaseRaw): Database {
  return {
    id: raw.id,
    threadId: raw.thread_id,
    title: raw.title,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}

export function columnFromRaw(raw: DatabaseColumnRaw): DatabaseColumn {
  return {
    id: raw.id,
    databaseId: raw.database_id,
    name: raw.name,
    type: raw.type as DatabaseColumnType,
    width: raw.width,
    config: raw.config ? JSON.parse(raw.config) : {},
    sortOrder: raw.sort_order,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}

export function rowFromRaw(raw: DatabaseRowRaw): DatabaseRow {
  return {
    id: raw.id,
    databaseId: raw.database_id,
    values: raw.values ? JSON.parse(raw.values) : {},
    rowType: raw.row_type as "task" | null,
    sortOrder: raw.sort_order,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}
