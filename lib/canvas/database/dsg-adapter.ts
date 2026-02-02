/**
 * DSG Adapter Layer
 *
 * Converts between DatabaseBlockData and react-datasheet-grid's row format.
 */

import { Column, keyColumn, textColumn, floatColumn, dateColumn } from "react-datasheet-grid";
import {
  DatabaseBlockData,
  DatabaseColumnDef,
  DatabaseRowData,
  CellValue,
  SelectOption,
} from "./types";

// Row ID key for preserving row identity through DSG operations
export const ROW_ID_KEY = "__rowId";
export const ROW_ORDER_KEY = "__rowOrder";

// DSG Row type - flexible object with row metadata
export interface DSGRow {
  [ROW_ID_KEY]: string;
  [ROW_ORDER_KEY]: number;
  [columnId: string]: CellValue | string | number;
}

// Context passed to column builders
export interface ColumnContext {
  addSelectOption: (columnId: string, value: string) => string;
  getSelectOptions: (columnId: string) => SelectOption[];
}

/**
 * Convert DatabaseBlockData rows to DSG format
 */
export function toDSGData(data: DatabaseBlockData): DSGRow[] {
  return data.rows
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const dsgRow: DSGRow = {
        [ROW_ID_KEY]: row.id,
        [ROW_ORDER_KEY]: row.order,
      };

      // Copy cell values, converting select option IDs to display values
      for (const column of data.columns) {
        const cellValue = row.cells[column.id];

        if (column.type === "select" && typeof cellValue === "string" && column.options) {
          // For select, we store the option ID in DSG too (the select column component handles display)
          dsgRow[column.id] = cellValue;
        } else {
          dsgRow[column.id] = cellValue ?? null;
        }
      }

      return dsgRow;
    });
}

/**
 * Convert DSG rows back to DatabaseBlockData rows format
 */
export function fromDSGData(
  dsgData: DSGRow[],
  columns: DatabaseColumnDef[]
): DatabaseRowData[] {
  return dsgData.map((dsgRow, index) => {
    const cells: Record<string, CellValue> = {};

    for (const column of columns) {
      const value = dsgRow[column.id];
      cells[column.id] = value as CellValue;
    }

    return {
      id: dsgRow[ROW_ID_KEY],
      order: dsgRow[ROW_ORDER_KEY] ?? index,
      cells,
    };
  });
}

/**
 * Build DSG Column configuration from DatabaseColumnDef
 */
export function buildDSGColumn(
  column: DatabaseColumnDef,
  context: ColumnContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Column<any> {
  const baseConfig = {
    title: column.name,
    minWidth: 100,
    maxWidth: column.width || 250,
  };

  switch (column.type) {
    case "text":
      return {
        ...keyColumn(column.id, textColumn),
        ...baseConfig,
      };

    case "number":
      return {
        ...keyColumn(column.id, floatColumn),
        ...baseConfig,
      };

    case "status":
    case "multiselect":
      // Status and multiselect use select column for DSG (fallback behavior)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createSelectColumn: createSelectCol } = require("./dsg-columns/select-column");
      return {
        ...keyColumn(column.id, createSelectCol({
          columnId: column.id,
          options: column.options || [],
          onAddOption: (value: string) => context.addSelectOption(column.id, value),
          getOptions: () => context.getSelectOptions(column.id),
        })),
        ...baseConfig,
      };

    case "time":
      return {
        ...keyColumn(column.id, textColumn),
        ...baseConfig,
      };

    case "date":
      return {
        ...keyColumn(column.id, dateColumn),
        ...baseConfig,
      };

    case "select":
      // For select, we need a custom column - import dynamically to avoid circular deps
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createSelectColumn } = require("./dsg-columns/select-column");
      return {
        ...keyColumn(column.id, createSelectColumn({
          columnId: column.id,
          options: column.options || [],
          onAddOption: (value: string) => context.addSelectOption(column.id, value),
          getOptions: () => context.getSelectOptions(column.id),
        })),
        ...baseConfig,
      };

    default:
      return {
        ...keyColumn(column.id, textColumn),
        ...baseConfig,
      };
  }
}

/**
 * Build all DSG columns from DatabaseBlockData columns
 */
export function buildDSGColumns(
  columns: DatabaseColumnDef[],
  context: ColumnContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Column<any>[] {
  return columns.map((col) => buildDSGColumn(col, context));
}

/**
 * Generate a new row ID
 */
export function generateRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new empty DSG row
 */
export function createEmptyDSGRow(
  columns: DatabaseColumnDef[],
  order: number
): DSGRow {
  const row: DSGRow = {
    [ROW_ID_KEY]: generateRowId(),
    [ROW_ORDER_KEY]: order,
  };

  for (const column of columns) {
    switch (column.type) {
      case "multiselect":
        row[column.id] = [];
        break;
      case "number":
        row[column.id] = null;
        break;
      default:
        row[column.id] = null;
    }
  }

  return row;
}
