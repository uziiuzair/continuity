"use client";

import {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useCallback,
  useMemo,
} from "react";
import {
  BlockComponentProps,
  InlineContent,
} from "./types";
import { BlockRef } from "../Block";
import {
  normalizeToInlineContent,
  getPlainText,
  inlineContentToHtml,
} from "../utils/formatting-utils";

/**
 * ParagraphBlock - A simple contentEditable paragraph with rich text support
 *
 * Handles:
 * - Text input and updates
 * - Rich text rendering with styled spans
 * - Enter to create new paragraph
 * - Backspace on empty to delete
 * - Arrow navigation between blocks
 * - Slash command "/" to open block menu
 *
 * IMPORTANT: We render InlineContent as styled HTML spans.
 * Cursor position is preserved across re-renders using the
 * MutationObserver pattern.
 */
const ParagraphBlock = forwardRef<BlockRef, BlockComponentProps>(
  function ParagraphBlock(
    {
      block,
      onUpdate,
      onDelete,
      onAddAfter,
      onFocusPrevious,
      onFocusNext,
      onSlashMenu,
      onSlashMenuClose,
      onSlashMenuFilter,
    },
    ref
  ) {
    const elementRef = useRef<HTMLDivElement>(null);
    const isComposing = useRef(false);
    // Track the last content we set to detect external changes
    const lastContentRef = useRef<string | null>(null);
    // Track if slash menu is active
    const slashMenuActive = useRef(false);
    const slashStartIndex = useRef<number | null>(null);
    // Track if we're updating from internal input
    const isInternalUpdate = useRef(false);

    // Expose focus method via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (elementRef.current) {
          elementRef.current.focus();
          // Move cursor to end
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(elementRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      },
      getElement: () => elementRef.current,
    }));

    // Get the content and text
    const content = useMemo(
      () => normalizeToInlineContent(block.content),
      [block.content]
    );
    const text = useMemo(() => getPlainText(content), [content]);
    const hasStyles = useMemo(
      () => content.some((item) => item.styles && Object.keys(item.styles).length > 0),
      [content]
    );

    // Generate HTML for rendering styled content
    const styledHtml = useMemo(() => {
      if (!hasStyles) return null;
      return inlineContentToHtml(content);
    }, [content, hasStyles]);

    // Set initial content and handle external updates
    useEffect(() => {
      if (!elementRef.current) return;

      // Skip if this is our own internal update
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }

      // Only update DOM if content changed externally (not from our own input)
      if (lastContentRef.current !== text) {
        const currentText = elementRef.current.textContent || "";
        if (currentText !== text || hasStyles) {
          // Save cursor position
          const selection = window.getSelection();
          let cursorOffset = 0;
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            cursorOffset = getTextOffsetInElement(elementRef.current, range.startContainer, range.startOffset);
          }

          // Update content
          if (hasStyles && styledHtml) {
            elementRef.current.innerHTML = styledHtml;
          } else {
            elementRef.current.textContent = text;
          }

          // Restore cursor position if element is focused
          if (document.activeElement === elementRef.current && text.length > 0) {
            restoreCursorPosition(elementRef.current, Math.min(cursorOffset, text.length));
          }
        }
        lastContentRef.current = text;
      }
    }, [text, hasStyles, styledHtml]);

    // Get cursor position for slash menu positioning
    const getCursorPosition = useCallback((): { x: number; y: number } | null => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // If rect has no dimensions (empty line), use element position
      if (rect.width === 0 && rect.height === 0 && elementRef.current) {
        const elRect = elementRef.current.getBoundingClientRect();
        return { x: elRect.left, y: elRect.bottom + 4 };
      }

      return { x: rect.left, y: rect.bottom + 4 };
    }, []);

    // Handle input changes
    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        if (isComposing.current) return;

        const newText = e.currentTarget.textContent || "";
        // Update our ref so we know this change came from us
        lastContentRef.current = newText;
        isInternalUpdate.current = true;

        // When user types, convert to plain text InlineContent
        // (styles are preserved by the editor integration layer)
        const newContent: InlineContent[] = newText
          ? [{ type: "text", text: newText }]
          : [];

        onUpdate(block.id, {
          content: newContent,
        });

        // Check for slash command
        if (slashMenuActive.current && slashStartIndex.current !== null) {
          // Extract filter text after the slash
          const filterText = newText.slice(slashStartIndex.current + 1);

          // If there's a space or the slash was deleted, close the menu
          if (filterText.includes(" ") || !newText.includes("/")) {
            slashMenuActive.current = false;
            slashStartIndex.current = null;
            onSlashMenuClose?.();
          } else {
            onSlashMenuFilter?.(filterText);
          }
        }
      },
      [block.id, onUpdate, onSlashMenuClose, onSlashMenuFilter]
    );

    // Handle keydown events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        const currentText = elementRef.current?.textContent || "";

        // Slash "/" at start of empty block or after space - open slash menu
        if (e.key === "/" && onSlashMenu) {
          const selection = window.getSelection();
          const cursorPos = selection?.anchorOffset || 0;

          // Only trigger at start of block or after whitespace
          const charBefore = currentText[cursorPos - 1];
          if (cursorPos === 0 || charBefore === " " || charBefore === "\n") {
            // Allow the "/" to be typed first, then show menu
            setTimeout(() => {
              const position = getCursorPosition();
              if (position) {
                slashMenuActive.current = true;
                slashStartIndex.current = cursorPos;
                onSlashMenu(block.id, position);
              }
            }, 0);
          }
          return;
        }

        // Close slash menu on Escape
        if (e.key === "Escape" && slashMenuActive.current) {
          slashMenuActive.current = false;
          slashStartIndex.current = null;
          onSlashMenuClose?.();
          return;
        }

        // Enter - create new paragraph after this one (if slash menu not open)
        if (e.key === "Enter" && !e.shiftKey) {
          if (slashMenuActive.current) {
            // Let the slash menu handle Enter
            return;
          }
          e.preventDefault();
          onAddAfter(block.id);
          return;
        }

        // Backspace on empty - delete this block
        if (e.key === "Backspace") {
          const selection = window.getSelection();
          const isAtStart =
            selection?.anchorOffset === 0 && selection?.focusOffset === 0;
          const isEmpty = !elementRef.current?.textContent;

          // Close slash menu if deleting the slash
          if (slashMenuActive.current && slashStartIndex.current !== null) {
            const cursorPos = selection?.anchorOffset || 0;
            if (cursorPos <= slashStartIndex.current + 1) {
              slashMenuActive.current = false;
              slashStartIndex.current = null;
              onSlashMenuClose?.();
            }
          }

          if (isEmpty || isAtStart) {
            e.preventDefault();
            onDelete(block.id);
            return;
          }
        }

        // Arrow Up at start - focus previous block
        if (e.key === "ArrowUp") {
          if (slashMenuActive.current) {
            // Let the slash menu handle arrow keys
            return;
          }
          const selection = window.getSelection();
          if (selection?.anchorOffset === 0 && onFocusPrevious) {
            e.preventDefault();
            onFocusPrevious(block.id);
            return;
          }
        }

        // Arrow Down at end - focus next block
        if (e.key === "ArrowDown") {
          if (slashMenuActive.current) {
            // Let the slash menu handle arrow keys
            return;
          }
          const selection = window.getSelection();
          const textLength = elementRef.current?.textContent?.length || 0;
          if (selection?.anchorOffset === textLength && onFocusNext) {
            e.preventDefault();
            onFocusNext(block.id);
            return;
          }
        }
      },
      [
        block.id,
        onAddAfter,
        onDelete,
        onFocusPrevious,
        onFocusNext,
        onSlashMenu,
        onSlashMenuClose,
        getCursorPosition,
      ]
    );

    // Handle composition (for IME input)
    const handleCompositionStart = () => {
      isComposing.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
      isComposing.current = false;
      handleInput(e as unknown as React.FormEvent<HTMLDivElement>);
    };

    return (
      <div
        ref={elementRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        data-block-id={block.id}
        data-block-type="paragraph"
        className="block-paragraph outline-none py-1 min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
        data-placeholder="Type '/' for commands..."
      />
    );
  }
);

/**
 * Helper: Get text offset from start of element to a node/offset position
 */
function getTextOffsetInElement(root: HTMLElement, node: Node, offset: number): number {
  if (!root.contains(node)) return 0;

  let totalOffset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode === node) {
      return totalOffset + offset;
    }
    totalOffset += currentNode.textContent?.length || 0;
    currentNode = walker.nextNode();
  }

  // If node is the element itself
  if (node === root) {
    return offset;
  }

  return totalOffset;
}

/**
 * Helper: Restore cursor to a specific character offset
 */
function restoreCursorPosition(element: HTMLElement, offset: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  let currentOffset = 0;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const nodeLength = currentNode.textContent?.length || 0;
    if (currentOffset + nodeLength >= offset) {
      const range = document.createRange();
      range.setStart(currentNode, offset - currentOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    currentOffset += nodeLength;
    currentNode = walker.nextNode();
  }

  // If we couldn't find the position, move to end
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default ParagraphBlock;
