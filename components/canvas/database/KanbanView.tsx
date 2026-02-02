"use client";

import { useMemo, useState, useCallback } from "react";
import {
  DatabaseColumn,
  DatabaseRow,
  CellValue,
  SelectOption,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { getColorClasses } from "@/lib/canvas/database/colors";

interface KanbanViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onAddRow: (initialValues?: Record<string, CellValue>) => Promise<DatabaseRow | null>;
  onUpdateCell: (rowId: string, columnId: string, value: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
}

export function KanbanView({
  columns,
  rows,
  onAddRow,
  onUpdateCell,
  onDeleteRow,
}: KanbanViewProps) {
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Find a select column to group by (prefer "Status" name)
  const groupByColumn = useMemo(() => {
    // First try to find a column named "Status"
    const statusColumn = columns.find(
      (c) => c.type === "select" && c.name.toLowerCase() === "status"
    );
    if (statusColumn) return statusColumn;

    // Otherwise, use the first select column
    return columns.find((c) => c.type === "select");
  }, [columns]);

  // Find the title column (first text column, preferably named "Name" or "Title")
  const titleColumn = useMemo(() => {
    const namedColumn = columns.find(
      (c) =>
        c.type === "text" &&
        (c.name.toLowerCase() === "name" || c.name.toLowerCase() === "title")
    );
    if (namedColumn) return namedColumn;

    // Otherwise, use the first text column
    return columns.find((c) => c.type === "text");
  }, [columns]);

  // Group rows by the groupBy column's options
  const groupedRows = useMemo(() => {
    if (!groupByColumn) {
      return { ungrouped: rows };
    }

    const options = groupByColumn.config.options || [];
    const groups: Record<string, DatabaseRow[]> = {};

    // Initialize groups for each option
    for (const option of options) {
      groups[option.id] = [];
    }

    // Add an "ungrouped" category for rows without a value
    groups["__ungrouped__"] = [];

    // Sort rows into groups
    for (const row of rows) {
      const value = row.values[groupByColumn.id] as string | null;
      if (value && groups[value]) {
        groups[value].push(row);
      } else {
        groups["__ungrouped__"].push(row);
      }
    }

    return groups;
  }, [rows, groupByColumn]);

  // Get the title for a row
  const getRowTitle = useCallback(
    (row: DatabaseRow): string => {
      if (!titleColumn) return "Untitled";
      const value = row.values[titleColumn.id];
      return typeof value === "string" && value ? value : "Untitled";
    },
    [titleColumn]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, rowId: string) => {
      setDraggedRowId(rowId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", rowId);
    },
    []
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent, optionId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumnId(optionId);
    },
    []
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverColumnId(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent, optionId: string) => {
      e.preventDefault();
      setDragOverColumnId(null);

      const rowId = e.dataTransfer.getData("text/plain");
      if (!rowId || !groupByColumn) return;

      // Update the row's group column value
      const newValue = optionId === "__ungrouped__" ? null : optionId;
      onUpdateCell(rowId, groupByColumn.id, newValue);

      setDraggedRowId(null);
    },
    [groupByColumn, onUpdateCell]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedRowId(null);
    setDragOverColumnId(null);
  }, []);

  // Handle add card to column
  const handleAddCard = useCallback(
    async (optionId: string) => {
      if (!groupByColumn) return;

      const initialValues: Record<string, CellValue> = {};
      if (optionId !== "__ungrouped__") {
        initialValues[groupByColumn.id] = optionId;
      }

      await onAddRow(initialValues);
    },
    [groupByColumn, onAddRow]
  );

  if (!groupByColumn) {
    return (
      <div className="kanban-no-select">
        <div className="kanban-no-select-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="5" height="18" rx="1" />
            <rect x="10" y="3" width="5" height="12" rx="1" />
            <rect x="17" y="3" width="5" height="15" rx="1" />
          </svg>
        </div>
        <p className="kanban-no-select-title">No grouping column</p>
        <p className="kanban-no-select-desc">
          Add a Select column to enable Kanban view
        </p>
      </div>
    );
  }

  const options = groupByColumn.config.options || [];

  return (
    <div className="kanban-board">
      {/* Ungrouped column (if there are any ungrouped items) */}
      {groupedRows["__ungrouped__"]?.length > 0 && (
        <KanbanColumn
          key="__ungrouped__"
          title="No Status"
          color="gray"
          rows={groupedRows["__ungrouped__"]}
          getRowTitle={getRowTitle}
          onDragStart={handleDragStart}
          onDragOver={(e) => handleDragOver(e, "__ungrouped__")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "__ungrouped__")}
          onDragEnd={handleDragEnd}
          isDragOver={dragOverColumnId === "__ungrouped__"}
          draggedRowId={draggedRowId}
          onAddCard={() => handleAddCard("__ungrouped__")}
          onDeleteRow={onDeleteRow}
        />
      )}

      {/* Columns for each option */}
      {options.map((option) => (
        <KanbanColumn
          key={option.id}
          title={option.value}
          color={option.color}
          rows={groupedRows[option.id] || []}
          getRowTitle={getRowTitle}
          onDragStart={handleDragStart}
          onDragOver={(e) => handleDragOver(e, option.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, option.id)}
          onDragEnd={handleDragEnd}
          isDragOver={dragOverColumnId === option.id}
          draggedRowId={draggedRowId}
          onAddCard={() => handleAddCard(option.id)}
          onDeleteRow={onDeleteRow}
        />
      ))}
    </div>
  );
}

// ============================================
// Kanban Column Component
// ============================================

interface KanbanColumnProps {
  title: string;
  color: string;
  rows: DatabaseRow[];
  getRowTitle: (row: DatabaseRow) => string;
  onDragStart: (e: React.DragEvent, rowId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
  draggedRowId: string | null;
  onAddCard: () => void;
  onDeleteRow: (rowId: string) => void;
}

function KanbanColumn({
  title,
  color,
  rows,
  getRowTitle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragOver,
  draggedRowId,
  onAddCard,
  onDeleteRow,
}: KanbanColumnProps) {
  const colorClasses = getColorClasses(color as any);

  return (
    <div
      className={cn("kanban-column", isDragOver && "drag-over")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="kanban-column-header">
        <div
          className="kanban-column-header-dot"
          style={{ backgroundColor: colorClasses.bg }}
        />
        <span className="kanban-column-title">{title}</span>
        <span className="kanban-column-count">{rows.length}</span>
      </div>

      <div className="kanban-column-content">
        {rows.map((row) => (
          <KanbanCard
            key={row.id}
            row={row}
            title={getRowTitle(row)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggedRowId === row.id}
            onDelete={() => onDeleteRow(row.id)}
          />
        ))}

        <button className="kanban-add-card" onClick={onAddCard}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Add card</span>
        </button>
      </div>
    </div>
  );
}

// ============================================
// Kanban Card Component
// ============================================

interface KanbanCardProps {
  row: DatabaseRow;
  title: string;
  onDragStart: (e: React.DragEvent, rowId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onDelete: () => void;
}

function KanbanCard({
  row,
  title,
  onDragStart,
  onDragEnd,
  isDragging,
  onDelete,
}: KanbanCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn("kanban-card", isDragging && "dragging")}
      draggable
      onDragStart={(e) => onDragStart(e, row.id)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <span className="kanban-card-title">{title}</span>

      {showActions && (
        <button
          className="kanban-card-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
          </svg>
        </button>
      )}
    </div>
  );
}
