"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DatabaseColumn,
  DatabaseRow,
  CellValue,
  DatabaseColumnType,
  DatabaseColor,
  SelectOption,
} from "@/types/database";
import { cn } from "@/lib/utils";
import { getColorClasses, DATABASE_COLORS, ALL_COLORS } from "@/lib/canvas/database/colors";

interface TableViewProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onAddColumn: (name: string, type: DatabaseColumnType) => void;
  onUpdateColumn: (columnId: string, updates: Partial<DatabaseColumn>) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddRow: (initialValues?: Record<string, CellValue>) => Promise<DatabaseRow | null>;
  onUpdateCell: (rowId: string, columnId: string, value: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
  onAddSelectOption: (columnId: string, value: string, color?: DatabaseColor) => Promise<string | null>;
}

export function TableView({
  columns,
  rows,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onAddRow,
  onUpdateCell,
  onDeleteRow,
  onAddSelectOption,
}: TableViewProps) {
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Check if status column already exists
  const hasStatusColumn = columns.some((col) => col.type === "status");

  // Handle clicking outside to close active cell
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setActiveCell(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
      if (!activeCell) return;

      const moveToCell = (newRowIndex: number, newColIndex: number) => {
        if (newRowIndex >= 0 && newRowIndex < rows.length && newColIndex >= 0 && newColIndex < columns.length) {
          setActiveCell({
            rowId: rows[newRowIndex].id,
            columnId: columns[newColIndex].id,
          });
        }
      };

      switch (e.key) {
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            // Move left or up to previous row
            if (colIndex > 0) {
              moveToCell(rowIndex, colIndex - 1);
            } else if (rowIndex > 0) {
              moveToCell(rowIndex - 1, columns.length - 1);
            }
          } else {
            // Move right or down to next row
            if (colIndex < columns.length - 1) {
              moveToCell(rowIndex, colIndex + 1);
            } else if (rowIndex < rows.length - 1) {
              moveToCell(rowIndex + 1, 0);
            }
          }
          break;
        case "Enter":
          e.preventDefault();
          // Move down
          moveToCell(rowIndex + 1, colIndex);
          break;
        case "Escape":
          setActiveCell(null);
          break;
      }
    },
    [activeCell, rows, columns]
  );

  // Add new row
  const handleAddRow = useCallback(async () => {
    await onAddRow();
  }, [onAddRow]);

  // Sort rows by sortOrder
  const sortedRows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div ref={tableRef} className="table-view">
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <ColumnHeader
                  key={column.id}
                  column={column}
                  onUpdate={(updates) => onUpdateColumn(column.id, updates)}
                  onDelete={() => onDeleteColumn(column.id)}
                />
              ))}
              <th className="add-column-header">
                <AddColumnButton
                  show={showAddColumn}
                  onToggle={() => setShowAddColumn(!showAddColumn)}
                  onAdd={(name, type) => {
                    onAddColumn(name, type);
                    setShowAddColumn(false);
                  }}
                  hasStatusColumn={hasStatusColumn}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={row.id}>
                {columns.map((column, colIndex) => (
                  <td
                    key={`${row.id}-${column.id}`}
                    className={cn(
                      "table-cell",
                      activeCell?.rowId === row.id && activeCell?.columnId === column.id && "active"
                    )}
                    onClick={() => setActiveCell({ rowId: row.id, columnId: column.id })}
                  >
                    <Cell
                      column={column}
                      value={row.values[column.id]}
                      isActive={activeCell?.rowId === row.id && activeCell?.columnId === column.id}
                      onChange={(value) => onUpdateCell(row.id, column.id, value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      onAddOption={(value, color) => onAddSelectOption(column.id, value, color)}
                    />
                  </td>
                ))}
                <td className="row-actions">
                  <button
                    className="row-delete-btn"
                    onClick={() => onDeleteRow(row.id)}
                    title="Delete row"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <button className="add-row-btn" onClick={handleAddRow}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>New row</span>
      </button>
    </div>
  );
}

// ============================================
// Column Header Component
// ============================================

interface ColumnHeaderProps {
  column: DatabaseColumn;
  onUpdate: (updates: Partial<DatabaseColumn>) => void;
  onDelete: () => void;
}

function ColumnHeader({ column, onUpdate, onDelete }: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (name.trim() && name !== column.name) {
      onUpdate({ name: name.trim() });
    } else {
      setName(column.name);
    }
    setIsEditing(false);
  };

  const getTypeIcon = (type: DatabaseColumnType) => {
    switch (type) {
      case "text":
        return "Aa";
      case "number":
        return "#";
      case "select":
      case "multiselect":
        return "◉";
      case "date":
        return "📅";
      case "time":
        return "🕐";
      case "status":
        return "◐";
      default:
        return "?";
    }
  };

  return (
    <th className="column-header">
      <div className="column-header-content">
        <span className="column-type-icon">{getTypeIcon(column.type)}</span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="column-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setName(column.name);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="column-name"
            onDoubleClick={() => setIsEditing(true)}
          >
            {column.name}
          </span>
        )}
        <button className="column-delete-btn" onClick={onDelete} title="Delete column">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </th>
  );
}

// ============================================
// Add Column Button Component
// ============================================

interface AddColumnButtonProps {
  show: boolean;
  onToggle: () => void;
  onAdd: (name: string, type: DatabaseColumnType) => void;
  hasStatusColumn: boolean;
}

const COLUMN_TYPES: { type: DatabaseColumnType; label: string; icon: string }[] = [
  { type: "text", label: "Text", icon: "Aa" },
  { type: "number", label: "Number", icon: "#" },
  { type: "select", label: "Select", icon: "◉" },
  { type: "multiselect", label: "Multi-select", icon: "◉◉" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "time", label: "Time", icon: "🕐" },
  { type: "status", label: "Status", icon: "◐" },
];

function AddColumnButton({ show, onToggle, onAdd, hasStatusColumn }: AddColumnButtonProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [show, onToggle]);

  return (
    <div ref={menuRef} className="add-column-container">
      <button className="add-column-btn" onClick={onToggle} title="Add column">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {show && (
        <div className="add-column-menu">
          {COLUMN_TYPES.map((item) => {
            const disabled = item.type === "status" && hasStatusColumn;
            return (
              <button
                key={item.type}
                className={cn("add-column-option", disabled && "disabled")}
                onClick={() => !disabled && onAdd(item.label, item.type)}
                disabled={disabled}
                title={disabled ? "Only one Status column allowed" : undefined}
              >
                <span className="add-column-option-icon">{item.icon}</span>
                <span>{item.label}</span>
                {disabled && <span className="add-column-disabled-hint">(max 1)</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Cell Component
// ============================================

interface CellProps {
  column: DatabaseColumn;
  value: CellValue;
  isActive: boolean;
  onChange: (value: CellValue) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAddOption: (value: string, color?: DatabaseColor) => Promise<string | null>;
}

function Cell({ column, value, isActive, onChange, onKeyDown, onAddOption }: CellProps) {
  switch (column.type) {
    case "text":
      return (
        <TextCell
          value={value as string}
          isActive={isActive}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
    case "number":
      return (
        <NumberCell
          value={value as number}
          isActive={isActive}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
    case "select":
    case "status":
      return (
        <SelectCell
          value={value as string}
          options={column.config.options || []}
          isActive={isActive}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onAddOption={onAddOption}
          isStatus={column.type === "status"}
        />
      );
    case "multiselect":
      return (
        <MultiSelectCell
          value={Array.isArray(value) ? value : (value ? [value as string] : null)}
          options={column.config.options || []}
          isActive={isActive}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onAddOption={onAddOption}
        />
      );
    case "date":
      return (
        <DateCell
          value={value as string}
          isActive={isActive}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
    case "time":
      return (
        <TimeCell
          value={value as string}
          isActive={isActive}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
    default:
      return <span>{String(value || "")}</span>;
  }
}

// ============================================
// Text Cell
// ============================================

interface TextCellProps {
  value: string | null;
  isActive: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function TextCell({ value, isActive, onChange, onKeyDown }: TextCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  if (!isActive) {
    return <span className="cell-display">{value || ""}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="cell-input"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

// ============================================
// Number Cell
// ============================================

interface NumberCellProps {
  value: number | null;
  isActive: boolean;
  onChange: (value: number | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function NumberCell({ value, isActive, onChange, onKeyDown }: NumberCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  if (!isActive) {
    return <span className="cell-display">{value !== null ? value : ""}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="number"
      className="cell-input"
      value={value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? null : parseFloat(val));
      }}
      onKeyDown={onKeyDown}
    />
  );
}

// ============================================
// Select Cell (also used for Status)
// ============================================

interface SelectCellProps {
  value: string | null;
  options: SelectOption[];
  isActive: boolean;
  onChange: (value: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAddOption: (value: string, color?: DatabaseColor) => Promise<string | null>;
  isStatus?: boolean;
}

function SelectCell({
  value,
  options,
  isActive,
  onChange,
  onKeyDown,
  onAddOption,
  isStatus,
}: SelectCellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  useEffect(() => {
    if (isActive) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [isActive]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleSelect = (optionId: string | null) => {
    onChange(optionId);
    setShowDropdown(false);
  };

  const handleCreateOption = async () => {
    if (!newOptionValue.trim()) return;
    const newId = await onAddOption(newOptionValue.trim(), isStatus ? "blue" : undefined);
    if (newId) {
      onChange(newId);
    }
    setNewOptionValue("");
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="select-cell" onKeyDown={onKeyDown}>
      {selectedOption ? (
        <span
          className="select-tag"
          style={{
            backgroundColor: DATABASE_COLORS[selectedOption.color].bg,
            color: DATABASE_COLORS[selectedOption.color].text,
          }}
          onClick={() => setShowDropdown(true)}
        >
          {selectedOption.value}
        </span>
      ) : (
        <span className="select-placeholder" onClick={() => setShowDropdown(true)}>
          Select...
        </span>
      )}

      {showDropdown && (
        <div className="select-dropdown">
          <button className="select-option clear" onClick={() => handleSelect(null)}>
            Clear
          </button>
          {options.map((option) => (
            <button
              key={option.id}
              className={cn("select-option", value === option.id && "selected")}
              onClick={() => handleSelect(option.id)}
            >
              <span
                className="select-tag"
                style={{
                  backgroundColor: DATABASE_COLORS[option.color].bg,
                  color: DATABASE_COLORS[option.color].text,
                }}
              >
                {option.value}
              </span>
            </button>
          ))}
          <div className="select-create">
            <input
              type="text"
              className="select-create-input"
              placeholder="Create option..."
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateOption();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Multi-Select Cell
// ============================================

interface MultiSelectCellProps {
  value: string[] | null;
  options: SelectOption[];
  isActive: boolean;
  onChange: (value: string[]) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAddOption: (value: string, color?: DatabaseColor) => Promise<string | null>;
}

function MultiSelectCell({
  value,
  options,
  isActive,
  onChange,
  onKeyDown,
  onAddOption,
}: MultiSelectCellProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedValues = value || [];
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.id));

  useEffect(() => {
    if (isActive) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [isActive]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleToggle = (optionId: string) => {
    if (selectedValues.includes(optionId)) {
      onChange(selectedValues.filter((id) => id !== optionId));
    } else {
      onChange([...selectedValues, optionId]);
    }
  };

  const handleCreateOption = async () => {
    if (!newOptionValue.trim()) return;
    const newId = await onAddOption(newOptionValue.trim());
    if (newId) {
      onChange([...selectedValues, newId]);
    }
    setNewOptionValue("");
  };

  return (
    <div ref={containerRef} className="multiselect-cell" onKeyDown={onKeyDown}>
      <div className="multiselect-tags" onClick={() => setShowDropdown(true)}>
        {selectedOptions.length > 0 ? (
          selectedOptions.map((option) => (
            <span
              key={option.id}
              className="select-tag"
              style={{
                backgroundColor: DATABASE_COLORS[option.color].bg,
                color: DATABASE_COLORS[option.color].text,
              }}
            >
              {option.value}
            </span>
          ))
        ) : (
          <span className="select-placeholder">Select...</span>
        )}
      </div>

      {showDropdown && (
        <div className="select-dropdown">
          <button
            className="select-option clear"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
          {options.map((option) => (
            <button
              key={option.id}
              className={cn("select-option", selectedValues.includes(option.id) && "selected")}
              onClick={() => handleToggle(option.id)}
            >
              <span className="multiselect-checkbox">
                {selectedValues.includes(option.id) && "✓"}
              </span>
              <span
                className="select-tag"
                style={{
                  backgroundColor: DATABASE_COLORS[option.color].bg,
                  color: DATABASE_COLORS[option.color].text,
                }}
              >
                {option.value}
              </span>
            </button>
          ))}
          <div className="select-create">
            <input
              type="text"
              className="select-create-input"
              placeholder="Create option..."
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateOption();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Date Cell
// ============================================

interface DateCellProps {
  value: string | null;
  isActive: boolean;
  onChange: (value: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function DateCell({ value, isActive, onChange, onKeyDown }: DateCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  // Format for display
  const displayValue = value ? new Date(value).toLocaleDateString() : "";

  if (!isActive) {
    return <span className="cell-display">{displayValue}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="date"
      className="cell-input date-input"
      value={value ? value.split("T")[0] : ""}
      onChange={(e) => onChange(e.target.value || null)}
      onKeyDown={onKeyDown}
    />
  );
}

// ============================================
// Time Cell
// ============================================

interface TimeCellProps {
  value: string | null;
  isActive: boolean;
  onChange: (value: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function TimeCell({ value, isActive, onChange, onKeyDown }: TimeCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  if (!isActive) {
    return <span className="cell-display">{value || ""}</span>;
  }

  return (
    <input
      ref={inputRef}
      type="time"
      className="cell-input time-input"
      value={value || ""}
      onChange={(e) => onChange(e.target.value || null)}
      onKeyDown={onKeyDown}
    />
  );
}
