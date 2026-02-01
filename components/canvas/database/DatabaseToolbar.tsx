"use client";

import { useDatabase } from "./DatabaseContext";
import { DatabaseColumnType } from "@/lib/canvas/database/types";
import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";

// SVG Icons for column types
const TextTypeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
);

const NumberTypeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 17l4-10 4 10M6 13h4M15 7h2a2 2 0 012 2v0a2 2 0 01-2 2h-1M15 11h2a2 2 0 012 2v0a2 2 0 01-2 2h-2" />
  </svg>
);

const SelectTypeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const CheckboxTypeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const DateTypeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const COLUMN_TYPE_OPTIONS: {
  type: DatabaseColumnType;
  label: string;
  Icon: React.FC;
}[] = [
  { type: "text", label: "Text", Icon: TextTypeIcon },
  { type: "number", label: "Number", Icon: NumberTypeIcon },
  { type: "select", label: "Select", Icon: SelectTypeIcon },
  { type: "checkbox", label: "Checkbox", Icon: CheckboxTypeIcon },
  { type: "date", label: "Date", Icon: DateTypeIcon },
];

export function DatabaseToolbar() {
  const { addColumn } = useDatabase();

  return (
    <>
      <div className="database-toolbar">
        {/* Actions */}
        <div className="database-toolbar-actions">
          {/* Add Column Menu */}
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
              className="database-toolbar-dropdown"
              anchor="bottom start"
            >
              {COLUMN_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.type}>
                  <button
                    className={`database-toolbar-dropdown-item`}
                    onClick={() =>
                      addColumn({ name: option.label, type: option.type })
                    }
                  >
                    <span className="database-toolbar-dropdown-icon">
                      <option.Icon />
                    </span>
                    {option.label}
                  </button>
                </MenuItem>
              ))}
            </MenuItems>
          </Menu>
        </div>
      </div>
    </>
  );
}
