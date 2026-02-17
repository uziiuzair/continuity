"use client";

import type { ChartType } from "@/types/chart";
import { cn } from "@/lib/utils";

interface ChartToolbarProps {
  chartType: ChartType;
  showLegend: boolean;
  showGrid: boolean;
  isEditing: boolean;
  onChartTypeChange: (type: ChartType) => void;
  onToggleLegend: () => void;
  onToggleGrid: () => void;
  onToggleEdit: () => void;
  onConfigureDataSource?: () => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: string }[] = [
  { type: "bar", label: "Bar", icon: "||" },
  { type: "line", label: "Line", icon: "~" },
  { type: "area", label: "Area", icon: "/\\" },
  { type: "pie", label: "Pie", icon: "O" },
  { type: "donut", label: "Donut", icon: "()" },
];

export default function ChartToolbar({
  chartType,
  showLegend,
  showGrid,
  isEditing,
  onChartTypeChange,
  onToggleLegend,
  onToggleGrid,
  onToggleEdit,
  onConfigureDataSource,
}: ChartToolbarProps) {
  return (
    <div className="chart-toolbar">
      <div className="chart-toolbar-types">
        {CHART_TYPES.map(({ type, label }) => (
          <button
            key={type}
            className={cn(
              "chart-toolbar-type-btn",
              chartType === type && "active"
            )}
            onClick={() => onChartTypeChange(type)}
            title={label}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chart-toolbar-options">
        {chartType !== "pie" && chartType !== "donut" && (
          <button
            className={cn("chart-toolbar-opt-btn", showGrid && "active")}
            onClick={onToggleGrid}
            title="Toggle grid"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3v18h18M7 3v18M11 3v18M15 3v18M19 3v18M3 7h18M3 11h18M3 15h18M3 19h18" />
            </svg>
          </button>
        )}
        <button
          className={cn("chart-toolbar-opt-btn", showLegend && "active")}
          onClick={onToggleLegend}
          title="Toggle legend"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="5" width="4" height="4" rx="1" />
            <line x1="10" y1="7" x2="21" y2="7" />
            <rect x="3" y="15" width="4" height="4" rx="1" />
            <line x1="10" y1="17" x2="21" y2="17" />
          </svg>
        </button>
        <button
          className={cn("chart-toolbar-opt-btn", isEditing && "active")}
          onClick={onToggleEdit}
          title="Edit data"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        {onConfigureDataSource && (
          <button
            className="chart-toolbar-opt-btn"
            onClick={onConfigureDataSource}
            title="Configure Data Source"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
