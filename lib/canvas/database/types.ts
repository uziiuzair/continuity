/**
 * Database Block Types
 *
 * Type definitions for the Notion-style database block that supports
 * Table, List, and Kanban views with typed columns.
 */

// ============================================
// COLUMN TYPES
// ============================================

export type DatabaseColumnType =
  | "text"
  | "number"
  | "select"
  | "checkbox"
  | "date";

export type DatabaseColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

// View type removed - now using only table view via react-datasheet-grid

// ============================================
// SELECT OPTIONS
// ============================================

export interface SelectOption {
  id: string;
  value: string;
  color: DatabaseColor;
}

// ============================================
// COLUMN DEFINITION
// ============================================

export interface DatabaseColumnDef {
  id: string;
  name: string;
  type: DatabaseColumnType;
  width?: number; // Column width in pixels (for table view)
  options?: SelectOption[]; // For select type only
}

// ============================================
// CELL VALUES
// ============================================

export type CellValue =
  | string // text
  | number // number
  | boolean // checkbox
  | string // select (option id)
  | string // date (ISO string)
  | null;

// ============================================
// ROW
// ============================================

export interface DatabaseRowData {
  id: string;
  cells: Record<string, CellValue>; // columnId -> value
  color?: DatabaseColor; // Row highlight color
  order: number; // For ordering rows
}

// ============================================
// BLOCK PROPS
// ============================================

export interface DatabaseBlockData {
  columns: DatabaseColumnDef[];
  rows: DatabaseRowData[];
  title?: string; // Optional database title
}

// ============================================
// UPDATE TYPES (for context mutations)
// ============================================

export interface CellUpdate {
  rowId: string;
  columnId: string;
  value: CellValue;
}

export interface ColumnUpdate {
  columnId: string;
  name?: string;
  type?: DatabaseColumnType;
  width?: number;
  options?: SelectOption[];
}

export interface RowUpdate {
  rowId: string;
  color?: DatabaseColor;
  order?: number;
}

// ============================================
// CONTEXT TYPE
// ============================================

export interface DatabaseContextValue {
  data: DatabaseBlockData;

  // Bulk update (for DSG integration)
  setRows: (rows: DatabaseRowData[]) => void;

  // Columns
  addColumn: (column: Omit<DatabaseColumnDef, "id">) => void;
  updateColumn: (columnId: string, updates: Partial<DatabaseColumnDef>) => void;
  deleteColumn: (columnId: string) => void;
  reorderColumn: (columnId: string, newIndex: number) => void;

  // Rows
  addRow: (initialCells?: Record<string, CellValue>) => string;
  updateRow: (rowId: string, updates: Partial<DatabaseRowData>) => void;
  deleteRow: (rowId: string) => void;
  reorderRow: (rowId: string, newOrder: number) => void;

  // Cells
  updateCell: (rowId: string, columnId: string, value: CellValue) => void;

  // Select options
  addSelectOption: (
    columnId: string,
    option: Omit<SelectOption, "id">
  ) => string;
  updateSelectOption: (
    columnId: string,
    optionId: string,
    updates: Partial<SelectOption>
  ) => void;
  deleteSelectOption: (columnId: string, optionId: string) => void;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface DatabaseBlockProps {
  data: DatabaseBlockData;
  onUpdate: (data: DatabaseBlockData) => void;
  isEditable?: boolean;
}

export interface CellProps {
  value: CellValue;
  column: DatabaseColumnDef;
  onChange: (value: CellValue) => void;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onEndEdit?: () => void;
}

export interface ColumnHeaderProps {
  column: DatabaseColumnDef;
  onUpdate: (updates: Partial<DatabaseColumnDef>) => void;
  onDelete: () => void;
}
