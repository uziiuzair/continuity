"use client";

import { DatabaseViewType } from "@/types/database";
import { cn } from "@/lib/utils";

interface ViewSwitcherProps {
  viewType: DatabaseViewType;
  onViewChange: (viewType: DatabaseViewType) => void;
}

const TableIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const KanbanIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="15" rx="1" />
  </svg>
);

const TasksIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="5" width="4" height="4" rx="1" />
    <line x1="10" y1="7" x2="21" y2="7" />
    <rect x="3" y="13" width="4" height="4" rx="1" />
    <line x1="10" y1="15" x2="21" y2="15" />
    <path d="M4 19l2 2 4-4" />
  </svg>
);

const VIEW_OPTIONS: {
  type: DatabaseViewType;
  label: string;
  Icon: React.FC;
}[] = [
  { type: "table", label: "Table", Icon: TableIcon },
  { type: "kanban", label: "Board", Icon: KanbanIcon },
  { type: "tasks", label: "Tasks", Icon: TasksIcon },
];

export function ViewSwitcher({ viewType, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="view-switcher">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.type}
          className={cn(
            "view-switcher-btn",
            viewType === option.type && "active"
          )}
          onClick={() => onViewChange(option.type)}
          title={option.label}
        >
          <option.Icon />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
