"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  DatabaseColumn,
  DatabaseRow,
  CellValue,
  SelectOption,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { DATABASE_COLORS } from "@/lib/canvas/database/colors";

interface TasksViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onAddRow: (initialValues?: Record<string, CellValue>) => Promise<DatabaseRow | null>;
  onUpdateCell: (rowId: string, columnId: string, value: CellValue) => void;
  onUpdateRow: (
    rowId: string,
    updates: Partial<Pick<DatabaseRow, "values" | "rowType" | "sortOrder">>
  ) => void;
  onDeleteRow: (rowId: string) => void;
}

// Common "done" status names
const DONE_STATUS_NAMES = ["done", "complete", "completed", "finished"];

export function TasksView({
  columns,
  rows,
  onAddRow,
  onUpdateCell,
  onUpdateRow,
  onDeleteRow,
}: TasksViewProps) {
  const [newTaskText, setNewTaskText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the status column (for completion tracking)
  const statusColumn = useMemo(() => {
    // Look for a status type column
    return columns.find((c) => c.type === "status");
  }, [columns]);

  // Find the "done" option in the status column
  const doneOptionId = useMemo(() => {
    if (!statusColumn?.config.options) return null;
    const doneOption = statusColumn.config.options.find((opt) =>
      DONE_STATUS_NAMES.includes(opt.value.toLowerCase())
    );
    return doneOption?.id || null;
  }, [statusColumn]);

  // Find the title column (first text column)
  const titleColumn = useMemo(() => {
    const namedColumn = columns.find(
      (c) =>
        c.type === "text" &&
        (c.name.toLowerCase() === "name" ||
          c.name.toLowerCase() === "title" ||
          c.name.toLowerCase() === "task")
    );
    if (namedColumn) return namedColumn;

    return columns.find((c) => c.type === "text");
  }, [columns]);

  // Separate completed and pending tasks
  const { pendingTasks, completedTasks } = useMemo(() => {
    if (!statusColumn || !doneOptionId) {
      return { pendingTasks: rows, completedTasks: [] };
    }

    const pending: DatabaseRow[] = [];
    const completed: DatabaseRow[] = [];

    for (const row of rows) {
      const statusValue = row.values[statusColumn.id] as string | null;
      const isCompleted = statusValue === doneOptionId;
      if (isCompleted) {
        completed.push(row);
      } else {
        pending.push(row);
      }
    }

    // Sort by sortOrder
    pending.sort((a, b) => a.sortOrder - b.sortOrder);
    completed.sort((a, b) => a.sortOrder - b.sortOrder);

    return { pendingTasks: pending, completedTasks: completed };
  }, [rows, statusColumn, doneOptionId]);

  // Get the title for a row
  const getRowTitle = useCallback(
    (row: DatabaseRow): string => {
      if (!titleColumn) return "Untitled";
      const value = row.values[titleColumn.id];
      return typeof value === "string" && value ? value : "Untitled";
    },
    [titleColumn]
  );

  // Get the status option for a row
  const getRowStatus = useCallback(
    (row: DatabaseRow): SelectOption | null => {
      if (!statusColumn?.config.options) return null;
      const statusValue = row.values[statusColumn.id] as string | null;
      if (!statusValue) return null;
      return statusColumn.config.options.find((opt) => opt.id === statusValue) || null;
    },
    [statusColumn]
  );

  // Toggle task completion
  const handleToggle = useCallback(
    (row: DatabaseRow) => {
      if (!statusColumn) return;

      const currentValue = row.values[statusColumn.id] as string | null;
      const isCurrentlyDone = currentValue === doneOptionId;

      if (isCurrentlyDone) {
        // Mark as not done (clear status or set to first non-done option)
        const firstOption = statusColumn.config.options?.find(
          (opt) => !DONE_STATUS_NAMES.includes(opt.value.toLowerCase())
        );
        onUpdateCell(row.id, statusColumn.id, firstOption?.id || null);
      } else {
        // Mark as done
        onUpdateCell(row.id, statusColumn.id, doneOptionId);
      }

      // Mark row as task type for cross-thread queries
      if (!row.rowType) {
        onUpdateRow(row.id, { rowType: "task" });
      }
    },
    [statusColumn, doneOptionId, onUpdateCell, onUpdateRow]
  );

  // Add new task
  const handleAddTask = useCallback(async () => {
    if (!newTaskText.trim() || !titleColumn) return;

    const initialValues: Record<string, CellValue> = {
      [titleColumn.id]: newTaskText.trim(),
    };

    const newRow = await onAddRow(initialValues);
    if (newRow) {
      // Mark as task for cross-thread queries
      onUpdateRow(newRow.id, { rowType: "task" });
    }

    setNewTaskText("");
    inputRef.current?.focus();
  }, [newTaskText, titleColumn, onAddRow, onUpdateRow]);

  // Handle key press in input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTask();
      }
    },
    [handleAddTask]
  );

  if (!titleColumn) {
    return (
      <div className="tasks-no-text">
        <div className="tasks-no-text-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="5" width="4" height="4" rx="1" />
            <line x1="10" y1="7" x2="21" y2="7" />
            <rect x="3" y="13" width="4" height="4" rx="1" />
            <line x1="10" y1="15" x2="21" y2="15" />
          </svg>
        </div>
        <p className="tasks-no-text-title">No title column</p>
        <p className="tasks-no-text-desc">
          Add a Text column to enable Tasks view
        </p>
      </div>
    );
  }

  if (!statusColumn) {
    return (
      <div className="tasks-no-text">
        <div className="tasks-no-text-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l2 2" />
          </svg>
        </div>
        <p className="tasks-no-text-title">No status column</p>
        <p className="tasks-no-text-desc">
          Add a Status column to track task completion
        </p>
      </div>
    );
  }

  return (
    <div className="tasks-view">
      {/* Add task input */}
      <div className="tasks-add">
        <input
          ref={inputRef}
          type="text"
          className="tasks-add-input"
          placeholder="Add a task..."
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="tasks-add-btn"
          onClick={handleAddTask}
          disabled={!newTaskText.trim()}
        >
          Add
        </button>
      </div>

      {/* Pending tasks */}
      <div className="tasks-list">
        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="tasks-empty">
            No tasks yet. Add one above!
          </div>
        ) : (
          pendingTasks.map((row) => (
            <TaskRow
              key={row.id}
              row={row}
              title={getRowTitle(row)}
              status={getRowStatus(row)}
              isCompleted={false}
              onToggle={() => handleToggle(row)}
              onDelete={() => onDeleteRow(row.id)}
              titleColumn={titleColumn}
              onUpdateCell={onUpdateCell}
            />
          ))
        )}
      </div>

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <CompletedSection
          tasks={completedTasks}
          getRowTitle={getRowTitle}
          getRowStatus={getRowStatus}
          onToggle={handleToggle}
          onDelete={onDeleteRow}
          titleColumn={titleColumn}
          onUpdateCell={onUpdateCell}
        />
      )}
    </div>
  );
}

// ============================================
// Task Row Component
// ============================================

interface TaskRowProps {
  row: DatabaseRow;
  title: string;
  status: SelectOption | null;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
  titleColumn: DatabaseColumn;
  onUpdateCell: (rowId: string, columnId: string, value: CellValue) => void;
}

function TaskRow({
  row,
  title,
  status,
  isCompleted,
  onToggle,
  onDelete,
  titleColumn,
  onUpdateCell,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(title);
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    if (editText.trim() !== title) {
      onUpdateCell(row.id, titleColumn.id, editText.trim());
    }
    setIsEditing(false);
  }, [editText, title, row.id, titleColumn.id, onUpdateCell]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setEditText(title);
        setIsEditing(false);
      }
    },
    [handleSave, title]
  );

  return (
    <div
      className={cn("task-row", isCompleted && "completed")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        className={cn("task-checkbox", isCompleted && "checked")}
        onClick={onToggle}
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        {isCompleted && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
          >
            <path d="M5 12l5 5L19 7" />
          </svg>
        )}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="task-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          className="task-title"
          onDoubleClick={() => {
            setEditText(title);
            setIsEditing(true);
          }}
        >
          {title}
        </span>
      )}

      {status && (
        <span
          className="task-status-tag"
          style={{
            backgroundColor: DATABASE_COLORS[status.color].bg,
            color: DATABASE_COLORS[status.color].text,
          }}
        >
          {status.value}
        </span>
      )}

      {showActions && !isEditing && (
        <button
          className="task-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete task"
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

// ============================================
// Completed Section Component
// ============================================

interface CompletedSectionProps {
  tasks: DatabaseRow[];
  getRowTitle: (row: DatabaseRow) => string;
  getRowStatus: (row: DatabaseRow) => SelectOption | null;
  onToggle: (row: DatabaseRow) => void;
  onDelete: (rowId: string) => void;
  titleColumn: DatabaseColumn;
  onUpdateCell: (rowId: string, columnId: string, value: CellValue) => void;
}

function CompletedSection({
  tasks,
  getRowTitle,
  getRowStatus,
  onToggle,
  onDelete,
  titleColumn,
  onUpdateCell,
}: CompletedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="tasks-completed-section">
      <button
        className="tasks-completed-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            "tasks-completed-chevron",
            isExpanded && "expanded"
          )}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span>Completed ({tasks.length})</span>
      </button>

      {isExpanded && (
        <div className="tasks-completed-list">
          {tasks.map((row) => (
            <TaskRow
              key={row.id}
              row={row}
              title={getRowTitle(row)}
              status={getRowStatus(row)}
              isCompleted={true}
              onToggle={() => onToggle(row)}
              onDelete={() => onDelete(row.id)}
              titleColumn={titleColumn}
              onUpdateCell={onUpdateCell}
            />
          ))}
        </div>
      )}
    </div>
  );
}
