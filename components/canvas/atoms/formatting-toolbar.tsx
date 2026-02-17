"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { StyleKey } from "../utils/formatting-utils";
import { StyleState } from "../hooks/useTextSelection";

export interface SelectionInfo {
  blockId: string;
  startOffset: number;
  endOffset: number;
}

interface FormattingToolbarProps {
  /** Bounding rect of the selection for positioning */
  selectionRect: DOMRect;
  /** Currently active styles in the selection */
  activeStyles: StyleState;
  /** Selection info to pass back on style toggle */
  selectionInfo: SelectionInfo;
  /** Callback when a style button is clicked */
  onStyleToggle: (style: StyleKey, selectionInfo: SelectionInfo) => void;
  /** Callback when AI edit button is clicked */
  onAIEdit: (selectionInfo: SelectionInfo) => void;
  /** Callback when toolbar should close */
  onClose: () => void;
}

interface ToolbarPosition {
  x: number;
  y: number;
  placement: "above" | "below";
}

const TOOLBAR_HEIGHT = 36;
const TOOLBAR_OFFSET = 8;

/**
 * FormattingToolbar - Floating toolbar for text formatting
 *
 * Appears above the text selection with Bold, Italic, Underline,
 * Strikethrough, and Code buttons. Flips below if near viewport top.
 */
export function FormattingToolbar({
  selectionRect,
  activeStyles,
  selectionInfo,
  onStyleToggle,
  onAIEdit,
  onClose,
}: FormattingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  // Calculate position once toolbar is mounted and we know its width
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const toolbarWidth = toolbarRef.current?.offsetWidth || 180;

    // Calculate horizontal position (centered on selection)
    let x = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2;

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    if (x < 8) x = 8;
    if (x + toolbarWidth > viewportWidth - 8)
      x = viewportWidth - toolbarWidth - 8;

    // Calculate vertical position (above by default, below if near top)
    const spaceAbove = selectionRect.top;
    const spaceNeeded = TOOLBAR_HEIGHT + TOOLBAR_OFFSET;

    let y: number;
    let placement: "above" | "below";

    if (spaceAbove >= spaceNeeded) {
      // Position above
      y = selectionRect.top - TOOLBAR_HEIGHT - TOOLBAR_OFFSET;
      placement = "above";
    } else {
      // Position below
      y = selectionRect.bottom + TOOLBAR_OFFSET;
      placement = "below";
    }

    setPosition({ x, y, placement });
  }, [mounted, selectionRect]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    // Small delay to avoid immediate close from the selection click
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleStyleClick = useCallback(
    (e: React.MouseEvent, style: StyleKey) => {
      e.preventDefault();
      e.stopPropagation();
      onStyleToggle(style, selectionInfo);
    },
    [onStyleToggle, selectionInfo],
  );

  const handleAIClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onAIEdit(selectionInfo);
    },
    [onAIEdit, selectionInfo],
  );

  const toolbar = (
    <div
      ref={toolbarRef}
      className={cn(
        "formatting-toolbar",
        position?.placement === "below" && "below",
      )}
      style={{
        left: position?.x ?? -9999,
        top: position?.y ?? -9999,
        opacity: position ? 1 : 0,
      }}
      role="toolbar"
      aria-label="Text formatting"
    >
      <button
        className={cn("formatting-toolbar-btn", activeStyles.bold && "active")}
        onMouseDown={(e) => handleStyleClick(e, "bold")}
        aria-pressed={activeStyles.bold}
        title="Bold (⌘B)"
      >
        <BoldIcon />
      </button>
      <button
        className={cn(
          "formatting-toolbar-btn",
          activeStyles.italic && "active",
        )}
        onMouseDown={(e) => handleStyleClick(e, "italic")}
        aria-pressed={activeStyles.italic}
        title="Italic (⌘I)"
      >
        <ItalicIcon />
      </button>
      <button
        className={cn(
          "formatting-toolbar-btn",
          activeStyles.underline && "active",
        )}
        onMouseDown={(e) => handleStyleClick(e, "underline")}
        aria-pressed={activeStyles.underline}
        title="Underline (⌘U)"
      >
        <UnderlineIcon />
      </button>
      <button
        className={cn(
          "formatting-toolbar-btn",
          activeStyles.strikethrough && "active",
        )}
        onMouseDown={(e) => handleStyleClick(e, "strikethrough")}
        aria-pressed={activeStyles.strikethrough}
        title="Strikethrough"
      >
        <StrikethroughIcon />
      </button>
      <button
        className={cn("formatting-toolbar-btn", activeStyles.code && "active")}
        onMouseDown={(e) => handleStyleClick(e, "code")}
        aria-pressed={activeStyles.code}
        title="Inline Code"
      >
        <CodeIcon />
      </button>
      <div className="formatting-toolbar-separator" />
      <button
        className="formatting-toolbar-btn ai-edit-btn"
        onMouseDown={handleAIClick}
        title="AI Edit"
      >
        <SparkleIcon />
      </button>
    </div>
  );

  // Render via portal for proper z-index stacking
  if (typeof window === "undefined") return null;
  return createPortal(toolbar, document.body);
}

// Simple inline SVG icons for the toolbar buttons
function BoldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M6 12h8a4 4 0 0 0 0-8H6zm0 0h9a4 4 0 0 1 0 8H6z"
      />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M19 4h-9m4 16H5M15 4 9 20"
      />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M18 4v7a6 6 0 0 1-12 0V4M4 21h16"
      />
    </svg>
  );
}

function StrikethroughIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M6 16a4 4 0 0 0 4 4h4a4 4 0 0 0 0-8m4-4a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4m-3 4h18"
      />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="m16 18 6-6-6-6M8 6l-6 6 6 6"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="size-4"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 3v1m0 16v1m-7.07-2.93.7-.7m12.73-12.73.7-.7M3 12h1m16 0h1m-2.93 7.07-.7-.7M5.64 5.64l-.7-.7M12 7a5 5 0 0 0 0 10 5 5 0 0 0 0-10Z"
      />
      <path
        fill="currentColor"
        d="M12 8l1.5 3.5L17 13l-3.5 1.5L12 18l-1.5-3.5L7 13l3.5-1.5L12 8Z"
      />
    </svg>
  );
}
