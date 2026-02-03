"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useJournal } from "@/providers/journal-provider";
import Block, { BlockRef } from "@/components/canvas/Block";
import {
  EditorBlock,
  createEmptyParagraph,
  createHeading,
  createListItem,
  createCodeBlock,
  generateBlockId,
} from "@/components/canvas/blocks/types";
import { cn } from "@/lib/utils";
import { AddDropdown } from "@/components/canvas/atoms/add-dropdown";
import { SlashMenu, SlashMenuItem } from "@/components/canvas/atoms/slash-menu";

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * JournalEditor - Block-based editor for journal entries
 *
 * Similar to CustomEditor but:
 * - Works with JournalProvider instead of CanvasProvider
 * - Creates entry on first keystroke (lazy creation)
 * - Adds swipe gesture support for day navigation
 */
export default function JournalEditor() {
  const {
    currentEntry,
    isLoading,
    isSaving,
    isDirty,
    selectedDate,
    updateContent,
    navigateDay,
  } = useJournal();

  // Local block state
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);

  // Track which block is focused
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  // Selection state
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    new Set()
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Drag handle state
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [controlsTop, setControlsTop] = useState<number>(0);
  const [showControls, setShowControls] = useState(false);

  // Block dragging state
  const [isDraggingBlock, setIsDraggingBlock] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(0);
  const draggedBlockHeight = useRef(0);

  // Track if mouse is over the drag handle
  const [isHoveringHandle, setIsHoveringHandle] = useState(false);

  // Slash menu state
  const [slashMenuVisible, setSlashMenuVisible] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashMenuFilter, setSlashMenuFilter] = useState("");
  const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Map<string, BlockRef>>(new Map());
  const blockWrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const justFinishedSelecting = useRef(false);
  const hideHandleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we've initialized for this date
  const initializedForDate = useRef<string | null>(null);
  const lastSentContent = useRef<string | null>(null);

  // Initialize blocks when date changes or entry loads
  useEffect(() => {
    // Reset tracking when date changes
    if (initializedForDate.current !== selectedDate) {
      initializedForDate.current = selectedDate;
      lastSentContent.current = null;
    }

    // Compare incoming content
    const entryContent = currentEntry?.content;
    const incomingContentJson = entryContent ? JSON.stringify(entryContent) : null;

    // Skip if it's an echo
    if (incomingContentJson && incomingContentJson === lastSentContent.current) {
      return;
    }

    // Load entry content
    if (entryContent && Array.isArray(entryContent) && entryContent.length > 0) {
      const loadedBlocks = entryContent.map((block: unknown) => {
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
    } else if (!lastSentContent.current) {
      // Start with empty paragraph for new entries
      const emptyBlock = createEmptyParagraph();
      setBlocks([emptyBlock]);
    }
  }, [selectedDate, currentEntry]);

  // Sync blocks to provider
  useEffect(() => {
    if (blocks.length === 0) return;

    const blocksJson = JSON.stringify(blocks);
    if (blocksJson === lastSentContent.current) return;

    // Check if content is non-empty (at least some text)
    const hasContent = blocks.some((block) => {
      if (typeof block.content === "string") return block.content.length > 0;
      if (Array.isArray(block.content)) {
        return block.content.some((c) => c.text && c.text.length > 0);
      }
      return false;
    });

    // Only save if there's actual content (lazy creation)
    if (hasContent) {
      lastSentContent.current = blocksJson;
      updateContent(blocks);
    }
  }, [blocks, updateContent]);

  // Block update handler
  const handleUpdate = useCallback(
    (id: string, updates: Partial<EditorBlock>) => {
      setBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, ...updates } : block
        )
      );
    },
    []
  );

  // Block delete handler
  const handleDelete = useCallback((id: string) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      if (prev.length === 1) {
        return prev.map((b) => (b.id === id ? { ...b, content: [] } : b));
      }

      const newBlocks = prev.filter((b) => b.id !== id);
      const focusIndex = Math.max(0, index - 1);

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
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;

      const currentBlock = prev[index];
      let newBlock: EditorBlock;

      if (currentBlock.type === "listItem") {
        newBlock = createListItem(
          currentBlock.props?.listType as "bullet" | "numbered" | "todo"
        );
      } else {
        newBlock = createEmptyParagraph();
      }

      const newBlocks = [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1),
      ];

      setTimeout(() => {
        const ref = blockRefs.current.get(newBlock.id);
        ref?.focus();
      }, 0);

      return newBlocks;
    });
  }, []);

  // Add a specific block type
  const handleAddBlock = useCallback(
    (type: string, props?: Record<string, unknown>) => {
      if (!hoveredBlockId) return;

      let newBlock: EditorBlock;

      switch (type) {
        case "heading":
          newBlock = createHeading((props?.level as 1 | 2 | 3) || 1);
          break;
        case "listItem":
          newBlock = createListItem(
            (props?.listType as "bullet" | "numbered" | "todo") || "bullet"
          );
          if (props?.checked !== undefined) {
            newBlock.props = { ...newBlock.props, checked: props.checked };
          }
          break;
        case "code":
          newBlock = createCodeBlock((props?.language as string) || "plaintext");
          break;
        case "paragraph":
        default:
          newBlock = createEmptyParagraph();
          break;
      }

      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === hoveredBlockId);
        if (index === -1) return [...prev, newBlock];

        return [
          ...prev.slice(0, index + 1),
          newBlock,
          ...prev.slice(index + 1),
        ];
      });

      setTimeout(() => {
        const ref = blockRefs.current.get(newBlock.id);
        ref?.focus();
      }, 0);
    },
    [hoveredBlockId]
  );

  // Slash menu handlers
  const handleSlashMenu = useCallback(
    (blockId: string, position: { x: number; y: number }) => {
      setSlashMenuBlockId(blockId);
      setSlashMenuPosition(position);
      setSlashMenuFilter("");
      setSlashMenuVisible(true);
    },
    []
  );

  const handleSlashMenuClose = useCallback(() => {
    setSlashMenuVisible(false);
    setSlashMenuBlockId(null);
    setSlashMenuFilter("");
  }, []);

  const handleSlashMenuFilterChange = useCallback((filter: string) => {
    setSlashMenuFilter(filter);
  }, []);

  const handleSlashMenuSelect = useCallback(
    (item: SlashMenuItem) => {
      if (!slashMenuBlockId) return;

      const blockIndex = blocks.findIndex((b) => b.id === slashMenuBlockId);
      if (blockIndex === -1) return;

      const currentBlock = blocks[blockIndex];
      const currentText =
        typeof currentBlock.content === "string"
          ? currentBlock.content
          : Array.isArray(currentBlock.content)
            ? currentBlock.content.map((c) => c.text).join("")
            : "";

      const slashIndex = currentText.lastIndexOf("/");
      const newContent = slashIndex >= 0 ? currentText.slice(0, slashIndex) : currentText;

      let newBlock: EditorBlock;
      switch (item.type) {
        case "heading":
          newBlock = createHeading((item.props?.level as 1 | 2 | 3) || 1);
          break;
        case "listItem":
          newBlock = createListItem(
            (item.props?.listType as "bullet" | "numbered" | "todo") || "bullet"
          );
          if (item.props?.checked !== undefined) {
            newBlock.props = { ...newBlock.props, checked: item.props.checked };
          }
          break;
        case "code":
          newBlock = createCodeBlock((item.props?.language as string) || "plaintext");
          break;
        case "paragraph":
        default:
          newBlock = createEmptyParagraph();
          break;
      }

      if (newContent.trim()) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === slashMenuBlockId
              ? { ...b, content: [{ type: "text" as const, text: newContent }] }
              : b
          )
        );
        setBlocks((prev) => {
          const index = prev.findIndex((b) => b.id === slashMenuBlockId);
          return [
            ...prev.slice(0, index + 1),
            newBlock,
            ...prev.slice(index + 1),
          ];
        });
      } else {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === slashMenuBlockId ? { ...newBlock, id: b.id } : b
          )
        );
      }

      handleSlashMenuClose();

      setTimeout(() => {
        const focusId = newContent.trim() ? newBlock.id : slashMenuBlockId;
        const ref = blockRefs.current.get(focusId);
        ref?.focus();
      }, 0);
    },
    [slashMenuBlockId, blocks, handleSlashMenuClose]
  );

  // Focus navigation
  const handleFocusPrevious = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index > 0) {
        const prevBlock = blocks[index - 1];
        const ref = blockRefs.current.get(prevBlock.id);
        ref?.focus();
      }
    },
    [blocks]
  );

  const handleFocusNext = useCallback(
    (id: string) => {
      const index = blocks.findIndex((b) => b.id === id);
      if (index < blocks.length - 1) {
        const nextBlock = blocks[index + 1];
        const ref = blockRefs.current.get(nextBlock.id);
        ref?.focus();
      }
    },
    [blocks]
  );

  // Register block ref
  const setBlockRef = useCallback((id: string, ref: BlockRef | null) => {
    if (ref) {
      blockRefs.current.set(id, ref);
    } else {
      blockRefs.current.delete(id);
    }
  }, []);

  // Check if rectangles intersect
  const rectsIntersect = useCallback(
    (
      r1: DOMRect,
      r2: { left: number; top: number; right: number; bottom: number }
    ) => {
      return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
      );
    },
    []
  );

  // Get blocks in selection
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
    [rectsIntersect]
  );

  // Mouse handlers for selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('[contenteditable="true"]')) {
        if (selectedBlockIds.size > 0) {
          setSelectedBlockIds(new Set());
        }
        return;
      }

      setIsSelecting(true);
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      });
      setSelectedBlockIds(new Set());
    },
    [selectedBlockIds.size]
  );

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
    [isSelecting, selectionBox, getBlocksInSelection]
  );

  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      if (selectedBlockIds.size > 0) {
        justFinishedSelecting.current = true;
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement?.closest('[contenteditable="true"]')) {
          activeElement.blur();
        }
      }
      setIsSelecting(false);
      setSelectionBox(null);
    }
  }, [isSelecting, selectedBlockIds.size]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (justFinishedSelecting.current) {
        justFinishedSelecting.current = false;
        return;
      }

      const target = e.target as HTMLElement;
      if (!target.closest("[data-block-id]") && selectedBlockIds.size > 0) {
        setSelectedBlockIds(new Set());
      }
    },
    [selectedBlockIds.size]
  );

  // Touch handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Only trigger if horizontal swipe is dominant and significant
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
        if (deltaX > 0) {
          navigateDay("prev");
        } else {
          navigateDay("next");
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [navigateDay]
  );

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedBlockIds.size > 0
      ) {
        const activeElement = document.activeElement;
        if (activeElement?.closest('[contenteditable="true"]')) return;

        e.preventDefault();
        setBlocks((prev) => {
          const remaining = prev.filter((b) => !selectedBlockIds.has(b.id));
          if (remaining.length === 0) {
            return [createEmptyParagraph()];
          }
          return remaining;
        });
        setSelectedBlockIds(new Set());
      }

      if (e.key === "Escape" && selectedBlockIds.size > 0) {
        setSelectedBlockIds(new Set());
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        const activeElement = document.activeElement;
        if (!activeElement?.closest('[contenteditable="true"]')) {
          e.preventDefault();
          setSelectedBlockIds(new Set(blocks.map((b) => b.id)));
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedBlockIds, blocks]);

  // Global mouse up listener
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideHandleTimeoutRef.current) {
        clearTimeout(hideHandleTimeoutRef.current);
      }
    };
  }, []);

  // Selection box styles
  const selectionBoxStyle = useMemo(() => {
    if (!selectionBox) return null;

    const left = Math.min(selectionBox.startX, selectionBox.endX);
    const top = Math.min(selectionBox.startY, selectionBox.endY);
    const width = Math.abs(selectionBox.endX - selectionBox.startX);
    const height = Math.abs(selectionBox.endY - selectionBox.startY);

    return { left, top, width, height };
  }, [selectionBox]);

  // Update drag handle position
  useEffect(() => {
    if (!hoveredBlockId || !editorContentRef.current) {
      setShowControls(false);
      return;
    }

    const wrapperEl = blockWrapperRefs.current.get(hoveredBlockId);
    if (!wrapperEl) {
      setShowControls(false);
      return;
    }

    const contentRect = editorContentRef.current.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();

    const handleHeight = 24;
    const top =
      wrapperRect.top -
      contentRect.top +
      wrapperRect.height / 2 -
      handleHeight / 2;

    setControlsTop(top);
    setShowControls(true);
  }, [hoveredBlockId]);

  // Block hover handlers
  const handleBlockMouseEnter = useCallback(
    (blockId: string) => {
      if (hideHandleTimeoutRef.current) {
        clearTimeout(hideHandleTimeoutRef.current);
        hideHandleTimeoutRef.current = null;
      }

      if (!isSelecting) {
        setHoveredBlockId(blockId);
      }
    },
    [isSelecting]
  );

  const handleBlockMouseLeave = useCallback(() => {
    if (isHoveringHandle) return;

    hideHandleTimeoutRef.current = setTimeout(() => {
      setHoveredBlockId(null);
      hideHandleTimeoutRef.current = null;
    }, 150);
  }, [isHoveringHandle]);

  const handleDragHandleMouseEnter = useCallback(() => {
    if (hideHandleTimeoutRef.current) {
      clearTimeout(hideHandleTimeoutRef.current);
      hideHandleTimeoutRef.current = null;
    }
    setIsHoveringHandle(true);
  }, []);

  const handleDragHandleMouseLeave = useCallback(() => {
    setIsHoveringHandle(false);
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

  // Calculate drop index
  const calculateDropIndex = useCallback(
    (mouseY: number): number => {
      if (!editorContentRef.current) return 0;

      const contentRect = editorContentRef.current.getBoundingClientRect();
      const relativeY = mouseY - contentRect.top;

      let dropIndex = blocks.length;

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

  // Drag handle mouse down
  const handleDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!hoveredBlockId) return;

      e.preventDefault();
      e.stopPropagation();

      dragStartY.current = e.clientY;

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

  // Block drag move
  useEffect(() => {
    if (!isDraggingBlock) return;

    const handleMouseMove = (e: MouseEvent) => {
      const offset = e.clientY - dragStartY.current;
      setDragOffset(offset);

      const newDropIndex = calculateDropIndex(e.clientY);
      setDropTargetIndex(newDropIndex);
    };

    const handleMouseUp = () => {
      if (draggedBlockId !== null && dropTargetIndex !== null) {
        const currentIndex = blocks.findIndex((b) => b.id === draggedBlockId);

        if (currentIndex !== -1 && currentIndex !== dropTargetIndex) {
          setBlocks((prev) => {
            const newBlocks = [...prev];
            const [movedBlock] = newBlocks.splice(currentIndex, 1);

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

  // Block transform during drag
  const getBlockTransform = useCallback(
    (blockId: string, index: number): string => {
      if (!isDraggingBlock || draggedBlockId === null) return "";

      const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
      if (draggedIndex === -1) return "";

      if (blockId === draggedBlockId) {
        return `translateY(${dragOffset}px)`;
      }

      if (dropTargetIndex === null) return "";

      const blockHeight = draggedBlockHeight.current;

      if (dropTargetIndex > draggedIndex) {
        if (index > draggedIndex && index < dropTargetIndex) {
          return `translateY(-${blockHeight}px)`;
        }
      } else if (dropTargetIndex < draggedIndex) {
        if (index >= dropTargetIndex && index < draggedIndex) {
          return `translateY(${blockHeight}px)`;
        }
      }

      return "";
    },
    [isDraggingBlock, draggedBlockId, dragOffset, dropTargetIndex, blocks]
  );

  // Drop indicator position
  const dropIndicatorTop = useMemo(() => {
    if (dropTargetIndex === null || !editorContentRef.current) return null;

    const contentRect = editorContentRef.current.getBoundingClientRect();

    if (dropTargetIndex >= blocks.length) {
      const lastBlock = blocks[blocks.length - 1];
      if (!lastBlock) return null;
      const wrapperEl = blockWrapperRefs.current.get(lastBlock.id);
      if (!wrapperEl) return null;
      const wrapperRect = wrapperEl.getBoundingClientRect();
      return wrapperRect.bottom - contentRect.top;
    }

    const targetBlock = blocks[dropTargetIndex];
    const wrapperEl = blockWrapperRefs.current.get(targetBlock.id);
    if (!wrapperEl) return null;
    const wrapperRect = wrapperEl.getBoundingClientRect();
    return wrapperRect.top - contentRect.top;
  }, [dropTargetIndex, blocks]);

  // List position for numbered lists
  const getListPosition = useCallback(
    (blockId: string, index: number): number => {
      const block = blocks[index];
      if (
        block?.type !== "listItem" ||
        block?.props?.listType !== "numbered"
      ) {
        return 1;
      }

      let position = 1;
      for (let i = index - 1; i >= 0; i--) {
        const prevBlock = blocks[i];
        if (
          prevBlock.type === "listItem" &&
          prevBlock.props?.listType === "numbered"
        ) {
          position++;
        } else {
          break;
        }
      }
      return position;
    },
    [blocks]
  );

  // Status text
  const statusText = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isSaving) return "Saving...";
    if (isDirty) return "Unsaved";
    return "";
  }, [isLoading, isSaving, isDirty]);

  return (
    <div
      ref={editorRef}
      className={cn(
        "journal-editor custom-editor relative h-full",
        isSelecting ? "selecting" : "",
        isDraggingBlock ? "dragging-block" : ""
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
        {/* Floating block controls */}
        <div
          className={cn(
            "block-controls",
            showControls || isDraggingBlock || isHoveringHandle ? "visible" : ""
          )}
          style={{ top: controlsTop }}
          onMouseEnter={handleDragHandleMouseEnter}
          onMouseLeave={handleDragHandleMouseLeave}
        >
          <AddDropdown onAddBlock={handleAddBlock} />

          <div
            className={cn("drag-handle", isDraggingBlock ? "dragging" : "")}
            onMouseDown={handleDragHandleMouseDown}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="5" r="1.5" />
              <circle cx="16" cy="5" r="1.5" />
              <circle cx="8" cy="12" r="1.5" />
              <circle cx="16" cy="12" r="1.5" />
              <circle cx="8" cy="19" r="1.5" />
              <circle cx="16" cy="19" r="1.5" />
            </svg>
          </div>
        </div>

        {/* Drop indicator line */}
        {isDraggingBlock && dropIndicatorTop !== null && (
          <div className="drop-indicator" style={{ top: dropIndicatorTop }} />
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
              isDraggingBlock && draggedBlockId !== block.id ? "shifting" : ""
            )}
            style={{ transform: getBlockTransform(block.id, index) }}
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
              listPosition={getListPosition(block.id, index)}
              onSlashMenu={handleSlashMenu}
              onSlashMenuClose={handleSlashMenuClose}
              onSlashMenuFilter={handleSlashMenuFilterChange}
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

      {/* Slash command menu */}
      {slashMenuVisible && (
        <SlashMenu
          position={slashMenuPosition}
          filter={slashMenuFilter}
          onSelect={handleSlashMenuSelect}
          onClose={handleSlashMenuClose}
        />
      )}
    </div>
  );
}
