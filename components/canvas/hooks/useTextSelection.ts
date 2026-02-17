"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getTextSelection,
  getSelectionRect,
  TextSelection,
} from "../utils/selection-utils";
import { getActiveStylesInSelection } from "../utils/formatting-utils";

export interface StyleState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
}

export interface UseTextSelectionOptions {
  /** Ref to the editor container element */
  editorRef: React.RefObject<HTMLElement | null>;
  /** Throttle interval for selectionchange events in ms */
  throttleMs?: number;
}

export interface TextSelectionState {
  /** Whether there is an active non-collapsed selection */
  hasSelection: boolean;
  /** The selection details */
  selection: TextSelection | null;
  /** The bounding rect for positioning toolbar */
  rect: DOMRect | null;
  /** Active styles in the selection */
  activeStyles: StyleState;
}

const DEFAULT_STYLES: StyleState = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
};

/**
 * Hook for tracking text selection within the editor
 * Returns selection state and active formatting styles (read from DOM)
 */
export function useTextSelection({
  editorRef,
  throttleMs = 50,
}: UseTextSelectionOptions): TextSelectionState {
  const [state, setState] = useState<TextSelectionState>({
    hasSelection: false,
    selection: null,
    rect: null,
    activeStyles: DEFAULT_STYLES,
  });

  const lastUpdateRef = useRef<number>(0);
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const updateSelection = useCallback(() => {
    const selection = getTextSelection();

    if (!selection || selection.isCollapsed || !selection.blockId || !selection.blockElement) {
      setState({
        hasSelection: false,
        selection: null,
        rect: null,
        activeStyles: DEFAULT_STYLES,
      });
      return;
    }

    // Check if selection is within our editor
    if (editorRef.current) {
      if (!editorRef.current.contains(selection.blockElement)) {
        setState((prev) =>
          prev.hasSelection
            ? {
                hasSelection: false,
                selection: null,
                rect: null,
                activeStyles: DEFAULT_STYLES,
              }
            : prev
        );
        return;
      }
    }

    const rect = getSelectionRect();

    // Get active styles from the DOM
    const activeStyles = getActiveStylesInSelection(selection.blockElement);

    setState({
      hasSelection: true,
      selection,
      rect,
      activeStyles,
    });
  }, [editorRef]);

  // Throttled update handler
  const throttledUpdate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= throttleMs) {
      lastUpdateRef.current = now;
      updateSelection();
    } else {
      // Schedule update for later
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
      pendingUpdateRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        updateSelection();
        pendingUpdateRef.current = null;
      }, throttleMs - timeSinceLastUpdate);
    }
  }, [throttleMs, updateSelection]);

  // Listen for selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      throttledUpdate();
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
    };
  }, [throttledUpdate]);

  // Also update on mouseup to catch drag selections
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(updateSelection, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [updateSelection]);

  return state;
}
