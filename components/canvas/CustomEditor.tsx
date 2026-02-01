"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useCanvas } from "@/providers/canvas-provider";
import { useThreads } from "@/providers/threads-provider";
import Block, { BlockRef } from "./Block";
import {
  EditorBlock,
  createEmptyParagraph,
  generateBlockId,
} from "./blocks/types";
import { CanvasContent } from "@/types";
import { cn } from "@/lib/utils";

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * CustomEditor - A simple block-based editor
 *
 * Replaces BlockNote with a custom implementation for:
 * - Full control over persistence
 * - Simple styling
 * - Easy debugging
 */
export default function CustomEditor() {
  const { content, isLoading, isSaving, isDirty, updateContent } = useCanvas();
  const { activeThreadId } = useThreads();

  // Local block state
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);

  // Track which block is focused
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  // Selection state
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Drag handle state
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [dragHandlePosition, setDragHandlePosition] = useState<{
    top: number;
    opacity: number;
  } | null>(null);

  // Block dragging state
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0); // Y offset for dragged block
  const dragStartY = useRef(0);
  const draggedBlockHeight = useRef(0);

  // Track if mouse is over the drag handle
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, BlockRef>>(new Map());
  const blockWrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const justFinishedSelecting = useRef(false);
  const hideHandleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we've initialized for this thread
  const initializedForThread = useRef<string | null>(null);

  // Track the last content we sent to prevent loops
  const lastSentContent = useRef<string | null>(null);

  // Initialize blocks when thread changes or content loads
  useEffect(() => {
    if (initializedForThread.current === activeThreadId) {
      return;
    }

    initializedForThread.current = activeThreadId;

    if (content && Array.isArray(content) && content.length > 0) {
      // Content from database - convert to our block format
      const loadedBlocks = content.map((block: unknown) => {
        const b = block as EditorBlock;
        return {
          id: b.id || generateBlockId(),
          type: b.type || "paragraph",
          content: b.content,
          props: b.props || {},
          children: b.children,
        };
      });
      setBlocks(loadedBlocks);
      lastSentContent.current = JSON.stringify(loadedBlocks);
    } else if (activeThreadId) {
      // New/empty canvas - start with one empty paragraph
      const emptyBlock = createEmptyParagraph();
      setBlocks([emptyBlock]);
      lastSentContent.current = null;
    }
  }, [activeThreadId, content]);

  // Sync blocks to provider (with duplicate prevention)
  useEffect(() => {
    if (!activeThreadId) return;

    const blocksJson = JSON.stringify(blocks);
    if (blocksJson === lastSentContent.current) return;

    lastSentContent.current = blocksJson;
    updateContent(blocks as CanvasContent);
  }, [blocks, activeThreadId, updateContent]);

  // Block update handler
  const handleUpdate = useCallback(
    (id: string, updates: Partial<EditorBlock>) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, ...updates } : block,
        ),
      );
    },
    [],
  );

  // Block delete handler
  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      // Don't delete if it's the only block
      if (prev.length === 1) {
        // Instead, clear its content
        return prev.map((b) => (b.id === id ? { ...b, content: [] } : b));
      }

      // Focus the previous block (or next if deleting first)
      const newBlocks = prev.filter((b) => b.id !== id);
      const focusIndex = Math.max(0, index - 1);

      // Schedule focus after state update
      setTimeout(() => {
        const blockToFocus = newBlocks[focusIndex];
        if (blockToFocus) {
          const ref = blockRefs.current.get(blockToFocus.id);
          ref?.focus();
        }
      }, 0);

      return newBlocks;
    });
  }, []);

  // Add block after handler
  const handleAddAfter = useCallback((id: string) => {
    const newBlock = createEmptyParagraph();

    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const newBlocks = [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1),
      ];

      return newBlocks;
    });

    // Focus the new block after state update
    setTimeout(() => {
      const ref = blockRefs.current.get(newBlock.id);
      ref?.focus();
    }, 0);
  }, []);

  // Focus previous block
  const handleFocusPrevious = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index > 0) {
        const prevBlock = blocks[index - 1];
        const ref = blockRefs.current.get(prevBlock.id);
        ref?.focus();
      }
    },
    [blocks],
  );

  // Focus next block
  const handleFocusNext = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index < blocks.length - 1) {
        const nextBlock = blocks[index + 1];
        const ref = blockRefs.current.get(nextBlock.id);
        ref?.focus();
      }
    },
    [blocks],
  );

  // Register block ref
  const setBlockRef = useCallback((id: string, ref: BlockRef | null) => {
    if (ref) {
      blockRefs.current.set(id, ref);
    } else {
      blockRefs.current.delete(id);
    }
  }, []);

  // Check if two rectangles intersect
  const rectsIntersect = useCallback(
    (
      r1: DOMRect,
      r2: { left: number; top: number; right: number; bottom: number },
    ) => {
      return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
      );
    },
    [],
  );

  // Get blocks that intersect with selection box
  const getBlocksInSelection = useCallback(
    (box: SelectionBox) => {
      if (!editorRef.current) return new Set<string>();

      const selectionRect = {
        left: Math.min(box.startX, box.endX),
        top: Math.min(box.startY, box.endY),
        right: Math.max(box.startX, box.endX),
        bottom: Math.max(box.startY, box.endY),
      };

      const selected = new Set<string>();

      blockRefs.current.forEach((blockRef, blockId) => {
        const element = blockRef.getElement();
        if (element) {
          const blockRect = element.getBoundingClientRect();
          if (rectsIntersect(blockRect, selectionRect)) {
            selected.add(blockId);
          }
        }
      });

      return selected;
    },
    [rectsIntersect],
  );

  // Handle mouse down - start selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start selection on left click and not on a block's text
      if (e.button !== 0) return;

      // Check if clicking on editable content - don't start selection
      const target = e.target as HTMLElement;
      if (target.closest('[contenteditable="true"]')) {
        // Clear selection when clicking on text
        if (selectedBlockIds.size > 0) {
          setSelectedBlockIds(new Set());
        }
        return;
      }

      // Start selection
      setIsSelecting(true);
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      });
      setSelectedBlockIds(new Set());
    },
    [selectedBlockIds.size],
  );

  // Handle mouse move - update selection box
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selectionBox) return;

      const newBox = {
        ...selectionBox,
        endX: e.clientX,
        endY: e.clientY,
      };

      setSelectionBox(newBox);
      setSelectedBlockIds(getBlocksInSelection(newBox));
    },
    [isSelecting, selectionBox, getBlocksInSelection],
  );

  // Handle mouse up - finish selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      // Mark that we just finished selecting (to prevent click from clearing)
      if (selectedBlockIds.size > 0) {
        justFinishedSelecting.current = true;
        // Blur any focused contentEditable so keyboard shortcuts work
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.closest('[contenteditable="true"]')) {
          activeElement.blur();
        }
      }
      setIsSelecting(false);
      setSelectionBox(null);
    }
  }, [isSelecting, selectedBlockIds.size]);

  // Handle click outside to clear selection
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Skip if we just finished a selection drag
      if (justFinishedSelecting.current) {
        justFinishedSelecting.current = false;
        return;
      }

      const target = e.target as HTMLElement;
      // If clicking on empty space (not a block), clear selection
      if (!target.closest("[data-block-id]") && selectedBlockIds.size > 0) {
        setSelectedBlockIds(new Set());
      }
    },
    [selectedBlockIds.size],
  );

  // Handle keyboard events for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected blocks with Backspace or Delete
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedBlockIds.size > 0
      ) {
        // Don't delete if we're in an editable element
        const activeElement = document.activeElement;
        if (activeElement?.closest('[contenteditable="true"]')) return;

        e.preventDefault();
        setBlocks((prev) => {
          const remaining = prev.filter((b) => !selectedBlockIds.has(b.id));
          // Keep at least one block
          if (remaining.length === 0) {
            return [createEmptyParagraph()];
          }
          return remaining;
        });
        setSelectedBlockIds(new Set());
      }

      // Escape to clear selection
      if (e.key === "Escape" && selectedBlockIds.size > 0) {
        setSelectedBlockIds(new Set());
      }

      // Select all with Cmd/Ctrl+A
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        const activeElement = document.activeElement;
        // Only select all blocks if not in an editable element
        if (!activeElement?.closest('[contenteditable="true"]')) {
          e.preventDefault();
          setSelectedBlockIds(new Set(blocks.map((b) => b.id)));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedBlockIds, blocks]);

  // Add global mouse up listener to handle mouse up outside the editor
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionBox(null);
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [isSelecting]);

  // Cleanup hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hideHandleTimeoutRef.current) {
        clearTimeout(hideHandleTimeoutRef.current);
      }
    };
  }, []);

  // Calculate selection box styles
  const selectionBoxStyle = useMemo(() => {
    if (!selectionBox) return null;

    const left = Math.min(selectionBox.startX, selectionBox.endX);
    const top = Math.min(selectionBox.startY, selectionBox.endY);
    const width = Math.abs(selectionBox.endX - selectionBox.startX);
    const height = Math.abs(selectionBox.endY - selectionBox.startY);

    return {
      left,
      top,
      width,
      height,
    };
  }, [selectionBox]);

  // Update drag handle position when hovered block changes
  useEffect(() => {
    if (!hoveredBlockId || !editorContentRef.current) {
      setDragHandlePosition(null);
      return;
    }

    const wrapperEl = blockWrapperRefs.current.get(hoveredBlockId);
    if (!wrapperEl) return;

    const contentRect = editorContentRef.current.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();

    // Position relative to the editor content container, centered vertically
    const handleHeight = 24; // matches CSS
    const top = wrapperRect.top - contentRect.top + (wrapperRect.height / 2) - (handleHeight / 2);

    setDragHandlePosition({ top, opacity: 1 });
  }, [hoveredBlockId]);

  // Handle block hover
  const handleBlockMouseEnter = useCallback((blockId: string) => {
    // Clear any pending hide timeout
    if (hideHandleTimeoutRef.current) {
      clearTimeout(hideHandleTimeoutRef.current);
      hideHandleTimeoutRef.current = null;
    }

    if (!isSelecting) {
      setHoveredBlockId(blockId);
    }
  }, [isSelecting]);

  const handleBlockMouseLeave = useCallback(() => {
    // Don't hide if we're hovering over the drag handle
    if (isHoveringHandle) return;

    // Add delay before hiding to give user time to reach the handle
    hideHandleTimeoutRef.current = setTimeout(() => {
      setHoveredBlockId(null);
      hideHandleTimeoutRef.current = null;
    }, 150);
  }, [isHoveringHandle]);

  // Handle drag handle hover
  const handleDragHandleMouseEnter = useCallback(() => {
    // Clear any pending hide timeout
    if (hideHandleTimeoutRef.current) {
      clearTimeout(hideHandleTimeoutRef.current);
      hideHandleTimeoutRef.current = null;
    }
    setIsHoveringHandle(true);
  }, []);

  const handleDragHandleMouseLeave = useCallback(() => {
    setIsHoveringHandle(false);
    // Add delay before hiding
    if (!isDraggingBlock) {
      hideHandleTimeoutRef.current = setTimeout(() => {
        setHoveredBlockId(null);
        hideHandleTimeoutRef.current = null;
      }, 150);
    }
  }, [isDraggingBlock]);

  // Register block wrapper ref
  const setBlockWrapperRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        blockWrapperRefs.current.set(id, el);
      } else {
        blockWrapperRefs.current.delete(id);
      }
    },
    []
  );

  // Calculate drop target index based on mouse Y position
  const calculateDropIndex = useCallback(
    (mouseY: number): number => {
      if (!editorContentRef.current) return 0;

      const contentRect = editorContentRef.current.getBoundingClientRect();
      const relativeY = mouseY - contentRect.top;

      // Find the drop position by checking block midpoints
      let dropIndex = blocks.length; // Default to end

      for (let i = 0; i < blocks.length; i++) {
        const blockId = blocks[i].id;
        const wrapperEl = blockWrapperRefs.current.get(blockId);
        if (!wrapperEl) continue;

        const wrapperRect = wrapperEl.getBoundingClientRect();
        const blockTop = wrapperRect.top - contentRect.top;
        const blockMidpoint = blockTop + wrapperRect.height / 2;

        if (relativeY < blockMidpoint) {
          dropIndex = i;
          break;
        }
      }

      return dropIndex;
    },
    [blocks]
  );

  // Handle drag handle mouse down - start block drag
  const handleDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!hoveredBlockId) return;

      e.preventDefault();
      e.stopPropagation();

      // Store the starting Y position
      dragStartY.current = e.clientY;

      // Store the height of the dragged block
      const wrapperEl = blockWrapperRefs.current.get(hoveredBlockId);
      if (wrapperEl) {
        draggedBlockHeight.current = wrapperEl.getBoundingClientRect().height;
      }

      setIsDraggingBlock(true);
      setDraggedBlockId(hoveredBlockId);
      setDropTargetIndex(blocks.findIndex((b) => b.id === hoveredBlockId));
      setDragOffset(0);
    },
    [hoveredBlockId, blocks]
  );

  // Handle block drag move
  useEffect(() => {
    if (!isDraggingBlock) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Update the drag offset for the dragged block animation
      const offset = e.clientY - dragStartY.current;
      setDragOffset(offset);

      // Calculate where the block would drop
      const newDropIndex = calculateDropIndex(e.clientY);
      setDropTargetIndex(newDropIndex);
    };

    const handleMouseUp = () => {
      if (draggedBlockId !== null && dropTargetIndex !== null) {
        const currentIndex = blocks.findIndex((b) => b.id === draggedBlockId);

        if (currentIndex !== -1 && currentIndex !== dropTargetIndex) {
          // Reorder blocks
          setBlocks((prev) => {
            const newBlocks = [...prev];
            const [movedBlock] = newBlocks.splice(currentIndex, 1);

            // Adjust drop index if we're moving down
            const adjustedIndex =
              dropTargetIndex > currentIndex
                ? dropTargetIndex - 1
                : dropTargetIndex;

            newBlocks.splice(adjustedIndex, 0, movedBlock);
            return newBlocks;
          });
        }
      }

      setIsDraggingBlock(false);
      setDraggedBlockId(null);
      setDropTargetIndex(null);
      setDragOffset(0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingBlock, draggedBlockId, dropTargetIndex, blocks, calculateDropIndex]);

  // Calculate transform for each block during drag
  const getBlockTransform = useCallback(
    (blockId: string, index: number): string => {
      if (!isDraggingBlock || draggedBlockId === null) return "";

      const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
      if (draggedIndex === -1) return "";

      // The dragged block follows the cursor
      if (blockId === draggedBlockId) {
        return `translateY(${dragOffset}px)`;
      }

      // Other blocks shift to make room
      if (dropTargetIndex === null) return "";

      const blockHeight = draggedBlockHeight.current;

      // If dragging down (drop target is below original position)
      if (dropTargetIndex > draggedIndex) {
        // Blocks between original and drop target shift up
        if (index > draggedIndex && index < dropTargetIndex) {
          return `translateY(-${blockHeight}px)`;
        }
      }
      // If dragging up (drop target is above original position)
      else if (dropTargetIndex < draggedIndex) {
        // Blocks between drop target and original shift down
        if (index >= dropTargetIndex && index < draggedIndex) {
          return `translateY(${blockHeight}px)`;
        }
      }

      return "";
    },
    [isDraggingBlock, draggedBlockId, dragOffset, dropTargetIndex, blocks]
  );

  // Get the Y position for the drop indicator
  const dropIndicatorTop = useMemo(() => {
    if (dropTargetIndex === null || !editorContentRef.current) return null;

    const contentRect = editorContentRef.current.getBoundingClientRect();

    if (dropTargetIndex >= blocks.length) {
      // Drop at the end
      const lastBlock = blocks[blocks.length - 1];
      if (!lastBlock) return null;
      const wrapperEl = blockWrapperRefs.current.get(lastBlock.id);
      if (!wrapperEl) return null;
      const wrapperRect = wrapperEl.getBoundingClientRect();
      return wrapperRect.bottom - contentRect.top;
    }

    // Drop before a specific block
    const targetBlock = blocks[dropTargetIndex];
    const wrapperEl = blockWrapperRefs.current.get(targetBlock.id);
    if (!wrapperEl) return null;
    const wrapperRect = wrapperEl.getBoundingClientRect();
    return wrapperRect.top - contentRect.top;
  }, [dropTargetIndex, blocks]);

  // Status indicator
  const statusText = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isSaving) return "Saving...";
    if (isDirty) return "Unsaved";
    return "";
  }, [isLoading, isSaving, isDirty]);

  if (!activeThreadId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Select a thread to view its canvas</p>
      </div>
    );
  }

  return (
    <div
      ref={editorRef}
      className={cn(
        "custom-editor relative h-full",
        isSelecting ? "selecting" : "",
        isDraggingBlock ? "dragging-block" : "",
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      {statusText && (
        <div className="absolute top-0 right-0 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-bl z-10">
          {statusText}
        </div>
      )}

      <div
        ref={editorContentRef}
        className="editor-content relative"
        onMouseLeave={handleBlockMouseLeave}
      >
        {/* Floating drag handle */}
        <div
          className={cn(
            "drag-handle",
            (hoveredBlockId || isDraggingBlock || isHoveringHandle) ? "visible" : "",
            isDraggingBlock ? "dragging" : ""
          )}
          style={{
            top: dragHandlePosition?.top ?? 0,
          }}
          onMouseDown={handleDragHandleMouseDown}
          onMouseEnter={handleDragHandleMouseEnter}
          onMouseLeave={handleDragHandleMouseLeave}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="8" cy="5" r="1.5" />
            <circle cx="16" cy="5" r="1.5" />
            <circle cx="8" cy="12" r="1.5" />
            <circle cx="16" cy="12" r="1.5" />
            <circle cx="8" cy="19" r="1.5" />
            <circle cx="16" cy="19" r="1.5" />
          </svg>
        </div>

        {/* Drop indicator line */}
        {isDraggingBlock && dropIndicatorTop !== null && (
          <div
            className="drop-indicator"
            style={{ top: dropIndicatorTop }}
          />
        )}

        {blocks.map((block, index) => (
          <div
            key={block.id}
            ref={(el) => setBlockWrapperRef(block.id, el)}
            className={cn(
              "block-wrapper",
              selectedBlockIds.has(block.id) ? "selected" : "",
              hoveredBlockId === block.id ? "hovered" : "",
              draggedBlockId === block.id ? "dragging" : "",
              isDraggingBlock && draggedBlockId !== block.id ? "shifting" : "",
            )}
            style={{
              transform: getBlockTransform(block.id, index),
            }}
            onMouseEnter={() => handleBlockMouseEnter(block.id)}
          >
            <Block
              ref={(ref) => setBlockRef(block.id, ref)}
              block={block}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddAfter={handleAddAfter}
              onFocusPrevious={handleFocusPrevious}
              onFocusNext={handleFocusNext}
              isFocused={focusedBlockId === block.id}
            />
          </div>
        ))}
      </div>

      {/* Selection box overlay */}
      {isSelecting && selectionBoxStyle && (
        <div
          className="selection-box"
          style={{
            position: "fixed",
            left: selectionBoxStyle.left,
            top: selectionBoxStyle.top,
            width: selectionBoxStyle.width,
            height: selectionBoxStyle.height,
          }}
        />
      )}
    </div>
  );
}
