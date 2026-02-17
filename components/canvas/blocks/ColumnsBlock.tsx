"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
} from "react";
import type { BlockRef } from "../Block";
import Block from "../Block";
import type { BlockComponentProps, EditorBlock } from "./types";
import { createEmptyParagraph, generateBlockId } from "./types";
import type { ColumnLayout } from "@/types/chart";
import ColumnLayoutPicker from "../columns/ColumnLayoutPicker";
import { cn } from "@/lib/utils";

const LAYOUT_GRID: Record<string, string> = {
  "1": "1fr",
  "1/1": "1fr 1fr",
  "1/1/1": "1fr 1fr 1fr",
  "2/1": "2fr 1fr",
  "1/2": "1fr 2fr",
  "2/3": "2fr 3fr",
  "3/2": "3fr 2fr",
};

const ColumnsBlock = forwardRef<BlockRef, BlockComponentProps>(
  function ColumnsBlock({ block, onUpdate }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const blockRefsMap = useRef<Map<string, BlockRef>>(new Map());
    const [showLayoutPicker, setShowLayoutPicker] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => {
        // Focus first block in first column
        const firstCol = block.children?.[0];
        const firstChild = firstCol?.children?.[0];
        if (firstChild) {
          const childRef = blockRefsMap.current.get(firstChild.id);
          childRef?.focus();
        } else {
          containerRef.current?.focus();
        }
      },
      getElement: () => containerRef.current,
    }));

    const layout = (block.props?.layout as ColumnLayout) ?? "1/1";
    const columns = block.children ?? [];

    const handleLayoutChange = useCallback(
      (newLayout: ColumnLayout) => {
        const currentColCount = columns.length;
        const newColCount =
          newLayout === "1" ? 1 : newLayout === "1/1/1" ? 3 : 2;

        let newColumns = [...columns];

        if (newColCount > currentColCount) {
          // Add new empty columns
          for (let i = currentColCount; i < newColCount; i++) {
            newColumns.push({
              id: generateBlockId(),
              type: "column",
              children: [createEmptyParagraph()],
            });
          }
        } else if (newColCount < currentColCount) {
          // Move extra column content to last remaining column
          const extraBlocks = newColumns
            .slice(newColCount)
            .flatMap((col) => col.children ?? []);
          newColumns = newColumns.slice(0, newColCount);
          if (extraBlocks.length > 0 && newColumns[newColCount - 1]) {
            newColumns[newColCount - 1] = {
              ...newColumns[newColCount - 1],
              children: [
                ...(newColumns[newColCount - 1].children ?? []),
                ...extraBlocks,
              ],
            };
          }
        }

        onUpdate(block.id, {
          props: { ...block.props, layout: newLayout },
          children: newColumns,
        });
        setShowLayoutPicker(false);
      },
      [block.id, block.props, columns, onUpdate]
    );

    // Update a block within a specific column
    const handleColumnBlockUpdate = useCallback(
      (colIdx: number, childId: string, updates: Partial<EditorBlock>) => {
        const newColumns = columns.map((col, ci) => {
          if (ci !== colIdx) return col;
          return {
            ...col,
            children: (col.children ?? []).map((child) =>
              child.id === childId ? { ...child, ...updates } : child
            ),
          };
        });
        onUpdate(block.id, { children: newColumns });
      },
      [block.id, columns, onUpdate]
    );

    // Delete a block within a specific column
    const handleColumnBlockDelete = useCallback(
      (colIdx: number, childId: string) => {
        const newColumns = columns.map((col, ci) => {
          if (ci !== colIdx) return col;
          const children = (col.children ?? []).filter(
            (c) => c.id !== childId
          );
          // Keep at least one empty paragraph per column
          if (children.length === 0) {
            return { ...col, children: [createEmptyParagraph()] };
          }
          return { ...col, children };
        });
        onUpdate(block.id, { children: newColumns });
      },
      [block.id, columns, onUpdate]
    );

    // Add block after within a column
    const handleColumnBlockAddAfter = useCallback(
      (colIdx: number, childId: string) => {
        const newColumns = columns.map((col, ci) => {
          if (ci !== colIdx) return col;
          const children = col.children ?? [];
          const idx = children.findIndex((c) => c.id === childId);
          if (idx === -1) return col;

          const newBlock = createEmptyParagraph();
          const newChildren = [
            ...children.slice(0, idx + 1),
            newBlock,
            ...children.slice(idx + 1),
          ];

          // Focus the new block after render
          setTimeout(() => {
            const ref = blockRefsMap.current.get(newBlock.id);
            ref?.focus();
          }, 0);

          return { ...col, children: newChildren };
        });
        onUpdate(block.id, { children: newColumns });
      },
      [block.id, columns, onUpdate]
    );

    // Focus navigation within columns
    const handleFocusPrevious = useCallback(
      (colIdx: number, childId: string) => {
        const col = columns[colIdx];
        const children = col?.children ?? [];
        const idx = children.findIndex((c) => c.id === childId);
        if (idx > 0) {
          const prevBlock = children[idx - 1];
          const ref = blockRefsMap.current.get(prevBlock.id);
          ref?.focus();
        }
        // If at top of column, let parent handle (do nothing here)
      },
      [columns]
    );

    const handleFocusNext = useCallback(
      (colIdx: number, childId: string) => {
        const col = columns[colIdx];
        const children = col?.children ?? [];
        const idx = children.findIndex((c) => c.id === childId);
        if (idx < children.length - 1) {
          const nextBlock = children[idx + 1];
          const ref = blockRefsMap.current.get(nextBlock.id);
          ref?.focus();
        }
        // If at bottom of last column, let parent handle
      },
      [columns]
    );

    const setChildBlockRef = useCallback(
      (id: string, childRef: BlockRef | null) => {
        if (childRef) {
          blockRefsMap.current.set(id, childRef);
        } else {
          blockRefsMap.current.delete(id);
        }
      },
      []
    );

    return (
      <div
        ref={containerRef}
        className="block-columns"
        contentEditable={false}
        data-block-id={block.id}
        tabIndex={-1}
      >
        {/* Layout picker toolbar */}
        <div className="columns-toolbar">
          <button
            className="columns-layout-btn"
            onClick={() => setShowLayoutPicker((p) => !p)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span className="text-xs">Layout</span>
          </button>
          {showLayoutPicker && (
            <div className="columns-layout-popover">
              <ColumnLayoutPicker
                currentLayout={layout}
                onSelect={handleLayoutChange}
              />
            </div>
          )}
        </div>

        {/* Columns grid */}
        <div
          className="columns-grid"
          style={{
            gridTemplateColumns: LAYOUT_GRID[layout] ?? "1fr 1fr",
          }}
        >
          {columns.map((col, colIdx) => (
            <div key={col.id} className="column-slot">
              {(col.children ?? []).map((child) => (
                <div key={child.id} className="column-block-wrapper">
                  <Block
                    ref={(r) => setChildBlockRef(child.id, r)}
                    block={child}
                    onUpdate={(id, updates) =>
                      handleColumnBlockUpdate(colIdx, id, updates)
                    }
                    onDelete={(id) => handleColumnBlockDelete(colIdx, id)}
                    onAddAfter={(id) =>
                      handleColumnBlockAddAfter(colIdx, id)
                    }
                    onFocusPrevious={(id) =>
                      handleFocusPrevious(colIdx, id)
                    }
                    onFocusNext={(id) => handleFocusNext(colIdx, id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

export default ColumnsBlock;
