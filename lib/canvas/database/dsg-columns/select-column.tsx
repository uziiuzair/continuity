"use client";

/**
 * Custom Select Column for react-datasheet-grid
 *
 * Provides a dropdown with colored option badges and the ability to create new options.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { CellComponent, Column } from "react-datasheet-grid";
import { SelectOption, DatabaseColor } from "../types";
import { DATABASE_COLORS, ALL_COLORS } from "../colors";

interface SelectColumnConfig {
  columnId: string;
  options: SelectOption[];
  onAddOption: (value: string) => string;
  getOptions: () => SelectOption[];
}

interface SelectCellProps {
  rowData: string | null;
  setRowData: (value: string | null) => void;
  focus: boolean;
  stopEditing: (opts?: { nextRow?: boolean }) => void;
  active: boolean;
  columnData: SelectColumnConfig;
}

const SelectCellComponent: CellComponent<string | null, SelectColumnConfig> = ({
  rowData,
  setRowData,
  focus,
  stopEditing,
  active,
  columnData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get fresh options from context (they may have been updated)
  const options = columnData.getOptions();
  const selectedOption = options.find((opt) => opt.id === rowData);

  // Open dropdown when cell becomes active
  useEffect(() => {
    if (focus && active) {
      setIsOpen(true);
    }
  }, [focus, active]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingOption(null);
        stopEditing();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, stopEditing]);

  const handleSelect = useCallback(
    (optionId: string | null) => {
      setRowData(optionId);
      setIsOpen(false);
      stopEditing({ nextRow: false });
    },
    [setRowData, stopEditing]
  );

  const handleCreateOption = useCallback(() => {
    if (!newOptionValue.trim()) return;

    const newOptionId = columnData.onAddOption(newOptionValue.trim());
    setNewOptionValue("");
    handleSelect(newOptionId);
  }, [newOptionValue, columnData, handleSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setEditingOption(null);
        stopEditing();
      } else if (e.key === "Enter" && newOptionValue.trim()) {
        e.preventDefault();
        handleCreateOption();
      }
    },
    [stopEditing, newOptionValue, handleCreateOption]
  );

  const getTagStyle = (color: DatabaseColor): React.CSSProperties => {
    const config = DATABASE_COLORS[color];
    return {
      backgroundColor: config.bg,
      color: config.text,
    };
  };

  return (
    <div ref={containerRef} className="dsg-select-cell">
      {/* Display value or placeholder */}
      <div
        className="dsg-select-display"
        onClick={() => setIsOpen(true)}
      >
        {selectedOption ? (
          <span className="dsg-select-tag" style={getTagStyle(selectedOption.color)}>
            {selectedOption.value}
          </span>
        ) : (
          <span className="dsg-select-placeholder">Select...</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="dsg-select-dropdown">
          {/* Option list */}
          <div className="dsg-select-options">
            {/* Clear option */}
            <button
              className="dsg-select-option dsg-select-clear"
              onClick={() => handleSelect(null)}
            >
              <span className="dsg-select-option-text">Clear</span>
            </button>

            {options.map((option) => (
              <div
                key={option.id}
                className={`dsg-select-option ${rowData === option.id ? "selected" : ""}`}
              >
                <button
                  className="dsg-select-option-btn"
                  onClick={() => handleSelect(option.id)}
                >
                  <span className="dsg-select-tag" style={getTagStyle(option.color)}>
                    {option.value}
                  </span>
                </button>

                {/* Color picker toggle */}
                <button
                  className="dsg-select-option-edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingOption(editingOption === option.id ? null : option.id);
                  }}
                >
                  <ColorDot color={option.color} />
                </button>

                {/* Color picker dropdown */}
                {editingOption === option.id && (
                  <div className="dsg-color-picker">
                    <div className="dsg-color-picker-label">Color</div>
                    <div className="dsg-color-picker-grid">
                      {ALL_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`dsg-color-swatch ${option.color === color ? "selected" : ""}`}
                          style={{ backgroundColor: DATABASE_COLORS[color].bg }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Note: Color changes would need to go through context
                            // For now, just close the picker
                            setEditingOption(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Create new option */}
          <div className="dsg-select-create">
            <input
              ref={inputRef}
              type="text"
              className="dsg-select-create-input"
              placeholder="Create option..."
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {newOptionValue.trim() && (
              <button
                className="dsg-select-create-btn"
                onClick={handleCreateOption}
              >
                Create "{newOptionValue.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function ColorDot({ color }: { color: DatabaseColor }) {
  return (
    <span
      className="dsg-color-dot"
      style={{ backgroundColor: DATABASE_COLORS[color].text }}
    />
  );
}

/**
 * Create a select column configuration for DSG
 */
export function createSelectColumn(
  config: SelectColumnConfig
): Partial<Column<string | null, SelectColumnConfig>> {
  return {
    component: SelectCellComponent as CellComponent<string | null, SelectColumnConfig>,
    columnData: config,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? null,
    pasteValue: ({ value }) => {
      // When pasting, try to find matching option by value text
      const options = config.getOptions();
      const matchingOption = options.find(
        (opt) => opt.value.toLowerCase() === String(value).toLowerCase()
      );

      if (matchingOption) {
        return matchingOption.id;
      }

      // If no match and value is truthy, create new option
      if (value && String(value).trim()) {
        return config.onAddOption(String(value).trim());
      }

      return null;
    },
    isCellEmpty: ({ rowData }) => rowData === null || rowData === undefined,
  };
}
