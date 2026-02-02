"use client";

import { DatabaseColumnType } from "@/types/database";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";

const COLUMN_TYPE_OPTIONS: {
  type: DatabaseColumnType;
  label: string;
  icon: string;
}[] = [
  { type: "text", label: "Text", icon: "Aa" },
  { type: "number", label: "Number", icon: "#" },
  { type: "select", label: "Select", icon: "◉" },
  { type: "multiselect", label: "Multi-select", icon: "◉◉" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "time", label: "Time", icon: "🕐" },
  { type: "status", label: "Status", icon: "◐" },
];

interface DatabaseToolbarProps {
  onAddColumn: (name: string, type: DatabaseColumnType) => void;
  hasStatusColumn?: boolean;
}

export function DatabaseToolbar({ onAddColumn, hasStatusColumn }: DatabaseToolbarProps) {
  return (
    <div className="database-toolbar">
      <div className="database-toolbar-actions">
        <Menu as="div" className="database-toolbar-menu">
          <MenuButton className="database-toolbar-action-btn">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Property
          </MenuButton>

          <MenuItems
            anchor="bottom start"
            className="z-50 mt-2.5 flex max-h-60 min-w-48 origin-top flex-col overflow-auto rounded-md bg-white/80 text-base shadow-lg backdrop-blur-sm transition duration-300 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0 sm:text-sm"
            transition
          >
            {COLUMN_TYPE_OPTIONS.map((option) => {
              const disabled = option.type === "status" && hasStatusColumn;
              return (
                <MenuItem key={option.type}>
                  <button
                    className={`database-toolbar-dropdown-item ${disabled ? "opacity-50" : ""}`}
                    onClick={() => !disabled && onAddColumn(option.label, option.type)}
                    disabled={disabled}
                  >
                    <span className="database-toolbar-dropdown-icon">
                      {option.icon}
                    </span>
                    {option.label}
                    {disabled && <span className="ml-auto text-xs text-gray-400">(max 1)</span>}
                  </button>
                </MenuItem>
              );
            })}
          </MenuItems>
        </Menu>
      </div>
    </div>
  );
}
