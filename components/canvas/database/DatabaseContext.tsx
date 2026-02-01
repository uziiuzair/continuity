"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  DatabaseBlockData,
  DatabaseColumnDef,
  DatabaseRowData,
  DatabaseContextValue,
  CellValue,
  SelectOption,
} from "@/lib/canvas/database/types";
import {
  createColumn,
  createRow,
  createSelectOption,
  generateId,
  getNextColor,
} from "@/lib/canvas/database/defaults";

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  data: DatabaseBlockData;
  onUpdate: (data: DatabaseBlockData) => void;
  children: ReactNode;
}

export function DatabaseProvider({
  data,
  onUpdate,
  children,
}: DatabaseProviderProps) {
  // ============================================
  // COLUMN OPERATIONS
  // ============================================

  const addColumn = useCallback(
    (columnConfig: Omit<DatabaseColumnDef, "id">) => {
      const newColumn = createColumn(columnConfig.name, columnConfig.type, {
        width: columnConfig.width,
        options: columnConfig.options,
      });

      onUpdate({
        ...data,
        columns: [...data.columns, newColumn],
      });
    },
    [data, onUpdate]
  );

  const updateColumn = useCallback(
    (columnId: string, updates: Partial<DatabaseColumnDef>) => {
      onUpdate({
        ...data,
        columns: data.columns.map((col) =>
          col.id === columnId ? { ...col, ...updates } : col
        ),
      });
    },
    [data, onUpdate]
  );

  const deleteColumn = useCallback(
    (columnId: string) => {
      // Remove column and clean up cell data
      const newRows = data.rows.map((row) => {
        const { [columnId]: _, ...remainingCells } = row.cells;
        return { ...row, cells: remainingCells };
      });

      onUpdate({
        ...data,
        columns: data.columns.filter((col) => col.id !== columnId),
        rows: newRows,
      });
    },
    [data, onUpdate]
  );

  const reorderColumn = useCallback(
    (columnId: string, newIndex: number) => {
      const currentIndex = data.columns.findIndex((col) => col.id === columnId);
      if (currentIndex === -1 || currentIndex === newIndex) return;

      const newColumns = [...data.columns];
      const [removed] = newColumns.splice(currentIndex, 1);
      newColumns.splice(newIndex, 0, removed);

      onUpdate({
        ...data,
        columns: newColumns,
      });
    },
    [data, onUpdate]
  );

  // ============================================
  // BULK OPERATIONS (for DSG integration)
  // ============================================

  const setRows = useCallback(
    (rows: DatabaseRowData[]) => {
      onUpdate({
        ...data,
        rows,
      });
    },
    [data, onUpdate]
  );

  // ============================================
  // ROW OPERATIONS
  // ============================================

  const addRow = useCallback(
    (initialCells?: Record<string, CellValue>): string => {
      const maxOrder = data.rows.reduce(
        (max, row) => Math.max(max, row.order),
        -1
      );
      const newRow = createRow(maxOrder + 1, initialCells);

      onUpdate({
        ...data,
        rows: [...data.rows, newRow],
      });

      return newRow.id;
    },
    [data, onUpdate]
  );

  const updateRow = useCallback(
    (rowId: string, updates: Partial<DatabaseRowData>) => {
      onUpdate({
        ...data,
        rows: data.rows.map((row) =>
          row.id === rowId ? { ...row, ...updates } : row
        ),
      });
    },
    [data, onUpdate]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      onUpdate({
        ...data,
        rows: data.rows.filter((row) => row.id !== rowId),
      });
    },
    [data, onUpdate]
  );

  const reorderRow = useCallback(
    (rowId: string, newOrder: number) => {
      const currentRow = data.rows.find((row) => row.id === rowId);
      if (!currentRow) return;

      const currentOrder = currentRow.order;
      if (currentOrder === newOrder) return;

      // Adjust order of affected rows
      const newRows = data.rows.map((row) => {
        if (row.id === rowId) {
          return { ...row, order: newOrder };
        }

        // Shift rows between old and new position
        if (currentOrder < newOrder) {
          // Moving down: shift rows up
          if (row.order > currentOrder && row.order <= newOrder) {
            return { ...row, order: row.order - 1 };
          }
        } else {
          // Moving up: shift rows down
          if (row.order >= newOrder && row.order < currentOrder) {
            return { ...row, order: row.order + 1 };
          }
        }

        return row;
      });

      onUpdate({
        ...data,
        rows: newRows,
      });
    },
    [data, onUpdate]
  );

  // ============================================
  // CELL OPERATIONS
  // ============================================

  const updateCell = useCallback(
    (rowId: string, columnId: string, value: CellValue) => {
      onUpdate({
        ...data,
        rows: data.rows.map((row) =>
          row.id === rowId
            ? { ...row, cells: { ...row.cells, [columnId]: value } }
            : row
        ),
      });
    },
    [data, onUpdate]
  );

  // ============================================
  // SELECT OPTION OPERATIONS
  // ============================================

  const addSelectOption = useCallback(
    (columnId: string, optionConfig: Omit<SelectOption, "id">): string => {
      const column = data.columns.find((col) => col.id === columnId);
      if (!column || column.type !== "select") return "";

      const existingOptions = column.options || [];
      const color = optionConfig.color || getNextColor(existingOptions);
      const newOption = createSelectOption(optionConfig.value, color);

      onUpdate({
        ...data,
        columns: data.columns.map((col) =>
          col.id === columnId
            ? { ...col, options: [...existingOptions, newOption] }
            : col
        ),
      });

      return newOption.id;
    },
    [data, onUpdate]
  );

  const updateSelectOption = useCallback(
    (columnId: string, optionId: string, updates: Partial<SelectOption>) => {
      onUpdate({
        ...data,
        columns: data.columns.map((col) =>
          col.id === columnId && col.options
            ? {
                ...col,
                options: col.options.map((opt) =>
                  opt.id === optionId ? { ...opt, ...updates } : opt
                ),
              }
            : col
        ),
      });
    },
    [data, onUpdate]
  );

  const deleteSelectOption = useCallback(
    (columnId: string, optionId: string) => {
      // Remove option and clear cells that reference it
      const newRows = data.rows.map((row) => {
        const cellValue = row.cells[columnId];
        if (cellValue === optionId) {
          return { ...row, cells: { ...row.cells, [columnId]: null } };
        }
        return row;
      });

      onUpdate({
        ...data,
        columns: data.columns.map((col) =>
          col.id === columnId && col.options
            ? { ...col, options: col.options.filter((opt) => opt.id !== optionId) }
            : col
        ),
        rows: newRows,
      });
    },
    [data, onUpdate]
  );

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const contextValue = useMemo<DatabaseContextValue>(
    () => ({
      data,
      setRows,
      addColumn,
      updateColumn,
      deleteColumn,
      reorderColumn,
      addRow,
      updateRow,
      deleteRow,
      reorderRow,
      updateCell,
      addSelectOption,
      updateSelectOption,
      deleteSelectOption,
    }),
    [
      data,
      setRows,
      addColumn,
      updateColumn,
      deleteColumn,
      reorderColumn,
      addRow,
      updateRow,
      deleteRow,
      reorderRow,
      updateCell,
      addSelectOption,
      updateSelectOption,
      deleteSelectOption,
    ]
  );

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
