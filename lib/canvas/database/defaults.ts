/**
 * Database Defaults and Factory Functions
 *
 * Provides default values and factory functions for creating database
 * blocks, columns, rows, and options.
 */

import {
  DatabaseBlockData,
  DatabaseColumnDef,
  DatabaseColumnType,
  DatabaseRowData,
  SelectOption,
  DatabaseColor,
  CellValue,
} from "./types";

// ============================================
// ID GENERATION
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_COLUMN_WIDTH = 150;
export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 500;

export const DEFAULT_SELECT_COLORS: DatabaseColor[] = [
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "pink",
  "gray",
];

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createColumn(
  name: string,
  type: DatabaseColumnType = "text",
  options?: Partial<DatabaseColumnDef>
): DatabaseColumnDef {
  const column: DatabaseColumnDef = {
    id: generateId(),
    name,
    type,
    width: DEFAULT_COLUMN_WIDTH,
    ...options,
  };

  // Auto-create empty options array for select type
  if (type === "select" && !column.options) {
    column.options = [];
  }

  return column;
}

export function createRow(
  order: number,
  initialCells?: Record<string, CellValue>
): DatabaseRowData {
  return {
    id: generateId(),
    cells: initialCells || {},
    order,
  };
}

export function createSelectOption(
  value: string,
  color?: DatabaseColor
): SelectOption {
  return {
    id: generateId(),
    value,
    color: color || getNextColor([]),
  };
}

// ============================================
// DEFAULT DATABASE
// ============================================

export function createDefaultDatabase(title?: string): DatabaseBlockData {
  const nameColumn = createColumn("Name", "text");

  return {
    columns: [nameColumn],
    rows: [],
    title: title || "Untitled Database",
  };
}

export function createTaskDatabase(): DatabaseBlockData {
  const nameColumn = createColumn("Task", "text");
  const statusColumn = createColumn("Status", "status");
  const priorityColumn = createColumn("Priority", "select");
  const dueColumn = createColumn("Due Date", "date");

  statusColumn.options = [
    createSelectOption("To Do", "gray"),
    createSelectOption("In Progress", "blue"),
    createSelectOption("Done", "green"),
  ];

  priorityColumn.options = [
    createSelectOption("Low", "gray"),
    createSelectOption("Medium", "yellow"),
    createSelectOption("High", "orange"),
    createSelectOption("Urgent", "red"),
  ];

  return {
    columns: [nameColumn, statusColumn, priorityColumn, dueColumn],
    rows: [],
    title: "Tasks",
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getNextColor(existingOptions: SelectOption[]): DatabaseColor {
  const usedColors = new Set(existingOptions.map((o) => o.color));
  for (const color of DEFAULT_SELECT_COLORS) {
    if (!usedColors.has(color)) {
      return color;
    }
  }
  // All colors used, cycle back
  return DEFAULT_SELECT_COLORS[existingOptions.length % DEFAULT_SELECT_COLORS.length];
}

export function getDefaultCellValue(type: DatabaseColumnType): CellValue {
  switch (type) {
    case "text":
      return "";
    case "number":
      return null;
    case "select":
    case "status":
      return null;
    case "multiselect":
      return [];
    case "date":
    case "time":
      return null;
    default:
      return null;
  }
}

export function formatCellValue(
  value: CellValue,
  type: DatabaseColumnType,
  options?: SelectOption[]
): string {
  if (value === null || value === undefined) return "";

  switch (type) {
    case "text":
      return String(value);
    case "number":
      return typeof value === "number" ? value.toString() : "";
    case "select":
    case "status":
      if (options && typeof value === "string") {
        const option = options.find((o) => o.id === value);
        return option?.value || "";
      }
      return "";
    case "multiselect":
      if (options && Array.isArray(value)) {
        return value
          .map((id) => options.find((o) => o.id === id)?.value || "")
          .filter(Boolean)
          .join(", ");
      }
      return "";
    case "date":
      if (typeof value === "string" && value) {
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }
      }
      return "";
    case "time":
      return typeof value === "string" ? value : "";
    default:
      return String(value);
  }
}

// ============================================
// VALIDATION
// ============================================

export function isValidCellValue(
  value: CellValue,
  type: DatabaseColumnType
): boolean {
  if (value === null) return true;

  switch (type) {
    case "text":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "select":
    case "status":
      return typeof value === "string";
    case "multiselect":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "date":
      if (typeof value !== "string") return false;
      try {
        new Date(value);
        return true;
      } catch {
        return false;
      }
    case "time":
      return typeof value === "string";
    default:
      return true;
  }
}

// ============================================
// SERIALIZATION
// ============================================

export const DEFAULT_DATABASE_DATA: DatabaseBlockData = createDefaultDatabase();

export function serializeDatabaseData(data: DatabaseBlockData): string {
  return JSON.stringify(data);
}

export function parseDatabaseData(json: string): DatabaseBlockData {
  try {
    const parsed = JSON.parse(json);
    // Validate basic structure
    if (!parsed.columns || !Array.isArray(parsed.columns)) {
      return createDefaultDatabase();
    }
    if (!parsed.rows || !Array.isArray(parsed.rows)) {
      parsed.rows = [];
    }
    // Remove legacy viewType and kanbanConfig if present
    delete parsed.viewType;
    delete parsed.kanbanConfig;
    return parsed as DatabaseBlockData;
  } catch {
    return createDefaultDatabase();
  }
}
