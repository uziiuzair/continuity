"use client";

import type { ColumnLayout } from "@/types/chart";
import { cn } from "@/lib/utils";

interface ColumnLayoutPickerProps {
  currentLayout: ColumnLayout;
  onSelect: (layout: ColumnLayout) => void;
}

const LAYOUTS: { layout: ColumnLayout; label: string; cols: number[] }[] = [
  { layout: "1/1", label: "2 equal", cols: [1, 1] },
  { layout: "1/1/1", label: "3 equal", cols: [1, 1, 1] },
  { layout: "2/1", label: "Wide left", cols: [2, 1] },
  { layout: "1/2", label: "Wide right", cols: [1, 2] },
  { layout: "2/3", label: "Narrow left", cols: [2, 3] },
  { layout: "3/2", label: "Narrow right", cols: [3, 2] },
];

export default function ColumnLayoutPicker({
  currentLayout,
  onSelect,
}: ColumnLayoutPickerProps) {
  return (
    <div className="column-layout-picker">
      {LAYOUTS.map(({ layout, label, cols }) => (
        <button
          key={layout}
          className={cn(
            "column-layout-option",
            currentLayout === layout && "active"
          )}
          onClick={() => onSelect(layout)}
          title={label}
        >
          <div className="column-layout-preview">
            {cols.map((weight, i) => (
              <div
                key={i}
                className="column-layout-col"
                style={{ flex: weight }}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
