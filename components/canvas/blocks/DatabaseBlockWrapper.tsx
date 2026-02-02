"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { BlockRef } from "../Block";
import { BlockComponentProps, EditorBlock } from "./types";
import { useThreads } from "@/providers/threads-provider";
import { isTauriContext } from "@/lib/db";
import {
  createDatabase,
  getDatabaseWithData,
  createColumn,
  updateColumn,
  deleteColumn as deleteDbColumn,
  createRow,
  updateCell as updateDbCell,
  updateRow,
  deleteRow as deleteDbRow,
  addSelectOption as addDbSelectOption,
  updateSelectOption as updateDbSelectOption,
  deleteSelectOption as deleteDbSelectOption,
} from "@/lib/db/databases";
import {
  DatabaseWithData,
  DatabaseColumn,
  DatabaseRow,
  DatabaseViewType,
  DatabaseColumnType,
  CellValue,
  SelectOption,
  DatabaseColor,
} from "@/types/database";
import { ViewSwitcher } from "../database/ViewSwitcher";
import { TableView } from "../database/TableView";
import { KanbanView } from "../database/KanbanView";
import { TasksView } from "../database/TasksView";

interface DatabaseBlockWrapperProps extends BlockComponentProps {
  block: EditorBlock;
}

/**
 * DatabaseBlockWrapper - Manages SQLite persistence and view switching
 *
 * Loads/creates database from SQLite on mount, provides context to child views.
 */
const DatabaseBlockWrapper = forwardRef<BlockRef, DatabaseBlockWrapperProps>(
  function DatabaseBlockWrapper({ block, onUpdate, ...restProps }, ref) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { activeThreadId } = useThreads();

    // Database state
    const [dbData, setDbData] = useState<DatabaseWithData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // View type from block props
    const viewType = (block.props?.viewType as DatabaseViewType) || "table";
    const databaseId = block.props?.databaseId as string | null;

    // Expose focus method
    useImperativeHandle(ref, () => ({
      focus: () => {
        wrapperRef.current?.focus();
      },
      getElement: () => wrapperRef.current,
    }));

    // Load or create database on mount
    useEffect(() => {
      if (!isTauriContext() || !activeThreadId) {
        setIsLoading(false);
        return;
      }

      const loadOrCreate = async () => {
        setIsLoading(true);
        setError(null);

        try {
          if (databaseId) {
            // Load existing database
            const data = await getDatabaseWithData(databaseId);
            if (data) {
              setDbData(data);
            } else {
              // Database was deleted, create new one
              const newData = await createDatabase(activeThreadId, "Untitled");
              setDbData(newData);
              onUpdate(block.id, {
                props: { ...block.props, databaseId: newData.database.id },
              });
            }
          } else {
            // Create new database
            const newData = await createDatabase(activeThreadId, "Untitled");
            setDbData(newData);
            onUpdate(block.id, {
              props: { ...block.props, databaseId: newData.database.id },
            });
          }
        } catch (err) {
          console.error("Failed to load/create database:", err);
          setError("Failed to load database");
        } finally {
          setIsLoading(false);
        }
      };

      loadOrCreate();
    }, [databaseId, activeThreadId]);

    // View type change handler
    const handleViewChange = useCallback(
      (newViewType: DatabaseViewType) => {
        onUpdate(block.id, {
          props: { ...block.props, viewType: newViewType },
        });
      },
      [block.id, block.props, onUpdate]
    );

    // ============================================
    // Column Operations
    // ============================================

    const handleAddColumn = useCallback(
      async (name: string, type: DatabaseColumnType) => {
        if (!dbData) return;

        try {
          const newColumn = await createColumn(
            dbData.database.id,
            name,
            type
          );
          setDbData((prev) =>
            prev
              ? { ...prev, columns: [...prev.columns, newColumn] }
              : null
          );
        } catch (err) {
          console.error("Failed to add column:", err);
        }
      },
      [dbData]
    );

    const handleUpdateColumn = useCallback(
      async (
        columnId: string,
        updates: Partial<Pick<DatabaseColumn, "name" | "type" | "width" | "config">>
      ) => {
        if (!dbData) return;

        try {
          const updated = await updateColumn(columnId, updates);
          if (updated) {
            setDbData((prev) =>
              prev
                ? {
                    ...prev,
                    columns: prev.columns.map((c) =>
                      c.id === columnId ? updated : c
                    ),
                  }
                : null
            );
          }
        } catch (err) {
          console.error("Failed to update column:", err);
        }
      },
      [dbData]
    );

    const handleDeleteColumn = useCallback(
      async (columnId: string) => {
        if (!dbData) return;

        try {
          await deleteDbColumn(columnId);
          setDbData((prev) =>
            prev
              ? {
                  ...prev,
                  columns: prev.columns.filter((c) => c.id !== columnId),
                }
              : null
          );
        } catch (err) {
          console.error("Failed to delete column:", err);
        }
      },
      [dbData]
    );

    // ============================================
    // Row Operations
    // ============================================

    const handleAddRow = useCallback(
      async (initialValues?: Record<string, CellValue>): Promise<DatabaseRow | null> => {
        if (!dbData) return null;

        try {
          const newRow = await createRow(dbData.database.id, initialValues);
          setDbData((prev) =>
            prev ? { ...prev, rows: [...prev.rows, newRow] } : null
          );
          return newRow;
        } catch (err) {
          console.error("Failed to add row:", err);
          return null;
        }
      },
      [dbData]
    );

    const handleUpdateCell = useCallback(
      async (rowId: string, columnId: string, value: CellValue) => {
        if (!dbData) return;

        try {
          const updated = await updateDbCell(rowId, columnId, value);
          if (updated) {
            setDbData((prev) =>
              prev
                ? {
                    ...prev,
                    rows: prev.rows.map((r) =>
                      r.id === rowId ? updated : r
                    ),
                  }
                : null
            );
          }
        } catch (err) {
          console.error("Failed to update cell:", err);
        }
      },
      [dbData]
    );

    const handleUpdateRow = useCallback(
      async (
        rowId: string,
        updates: Partial<Pick<DatabaseRow, "values" | "rowType" | "sortOrder">>
      ) => {
        if (!dbData) return;

        try {
          const updated = await updateRow(rowId, updates);
          if (updated) {
            setDbData((prev) =>
              prev
                ? {
                    ...prev,
                    rows: prev.rows.map((r) =>
                      r.id === rowId ? updated : r
                    ),
                  }
                : null
            );
          }
        } catch (err) {
          console.error("Failed to update row:", err);
        }
      },
      [dbData]
    );

    const handleDeleteRow = useCallback(
      async (rowId: string) => {
        if (!dbData) return;

        try {
          await deleteDbRow(rowId);
          setDbData((prev) =>
            prev
              ? { ...prev, rows: prev.rows.filter((r) => r.id !== rowId) }
              : null
          );
        } catch (err) {
          console.error("Failed to delete row:", err);
        }
      },
      [dbData]
    );

    // ============================================
    // Select Option Operations
    // ============================================

    const handleAddSelectOption = useCallback(
      async (
        columnId: string,
        value: string,
        color: DatabaseColor = "blue"
      ): Promise<string | null> => {
        if (!dbData) return null;

        try {
          const newOption = await addDbSelectOption(columnId, value, color);
          // Refetch column to get updated config
          const data = await getDatabaseWithData(dbData.database.id);
          if (data) {
            setDbData(data);
          }
          return newOption.id;
        } catch (err) {
          console.error("Failed to add select option:", err);
          return null;
        }
      },
      [dbData]
    );

    const handleUpdateSelectOption = useCallback(
      async (
        columnId: string,
        optionId: string,
        updates: Partial<Pick<SelectOption, "value" | "color">>
      ) => {
        if (!dbData) return;

        try {
          await updateDbSelectOption(columnId, optionId, updates);
          // Refetch to get updated config
          const data = await getDatabaseWithData(dbData.database.id);
          if (data) {
            setDbData(data);
          }
        } catch (err) {
          console.error("Failed to update select option:", err);
        }
      },
      [dbData]
    );

    const handleDeleteSelectOption = useCallback(
      async (columnId: string, optionId: string) => {
        if (!dbData) return;

        try {
          await deleteDbSelectOption(columnId, optionId);
          // Refetch to get updated config
          const data = await getDatabaseWithData(dbData.database.id);
          if (data) {
            setDbData(data);
          }
        } catch (err) {
          console.error("Failed to delete select option:", err);
        }
      },
      [dbData]
    );

    // ============================================
    // Bulk Row Update (for DSG)
    // ============================================

    const handleSetRows = useCallback(
      async (rows: DatabaseRow[]) => {
        if (!dbData) return;

        // For DSG integration, we need to sync the entire rows array
        // This is a simplified version - in production you'd want diffing
        setDbData((prev) => (prev ? { ...prev, rows } : null));
      },
      [dbData]
    );

    // ============================================
    // Render
    // ============================================

    if (!isTauriContext()) {
      return (
        <div
          ref={wrapperRef}
          className="database-block-wrapper"
          contentEditable={false}
        >
          <div className="database-block-placeholder">
            Database blocks require desktop app
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div
          ref={wrapperRef}
          className="database-block-wrapper"
          contentEditable={false}
        >
          <div className="database-block-loading">Loading database...</div>
        </div>
      );
    }

    if (error || !dbData) {
      return (
        <div
          ref={wrapperRef}
          className="database-block-wrapper"
          contentEditable={false}
        >
          <div className="database-block-error">
            {error || "Failed to load database"}
          </div>
        </div>
      );
    }

    const contextValue = {
      data: dbData,
      addColumn: handleAddColumn,
      updateColumn: handleUpdateColumn,
      deleteColumn: handleDeleteColumn,
      addRow: handleAddRow,
      updateCell: handleUpdateCell,
      updateRow: handleUpdateRow,
      deleteRow: handleDeleteRow,
      setRows: handleSetRows,
      addSelectOption: handleAddSelectOption,
      updateSelectOption: handleUpdateSelectOption,
      deleteSelectOption: handleDeleteSelectOption,
    };

    return (
      <div
        ref={wrapperRef}
        className="database-block-wrapper"
        contentEditable={false}
        data-database-block
      >
        <div className="database-block-header">
          <ViewSwitcher viewType={viewType} onViewChange={handleViewChange} />
        </div>

        <div className="database-block-content">
          {viewType === "table" && (
            <TableView
              columns={dbData.columns}
              rows={dbData.rows}
              onAddColumn={handleAddColumn}
              onUpdateColumn={handleUpdateColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddRow={handleAddRow}
              onUpdateCell={handleUpdateCell}
              onDeleteRow={handleDeleteRow}
              onAddSelectOption={handleAddSelectOption}
            />
          )}
          {viewType === "kanban" && (
            <KanbanView
              columns={dbData.columns}
              rows={dbData.rows}
              onAddRow={handleAddRow}
              onUpdateCell={handleUpdateCell}
              onDeleteRow={handleDeleteRow}
            />
          )}
          {viewType === "tasks" && (
            <TasksView
              columns={dbData.columns}
              rows={dbData.rows}
              onAddRow={handleAddRow}
              onUpdateCell={handleUpdateCell}
              onUpdateRow={handleUpdateRow}
              onDeleteRow={handleDeleteRow}
            />
          )}
        </div>
      </div>
    );
  }
);

export default DatabaseBlockWrapper;
