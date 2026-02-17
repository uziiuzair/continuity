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
import { cn } from "@/lib/utils";
import {
  normalizeToInlineContent,
  getPlainText,
  inlineContentToHtml,
} from "../utils/formatting-utils";

interface ListItemBlockProps extends BlockComponentProps {
  // Position in the list (1-indexed) for numbered lists
  listPosition?: number;
}

/**
 * ListItemBlock - Bullet, numbered, and todo list items with rich text support
 *
 * Handles:
 * - Text input and updates
 * - Rich text rendering with styled spans
 * - Enter to create new list item of same type
 * - Backspace on empty to convert to paragraph
 * - Checkbox toggle for todo items
 * - Arrow navigation between blocks
 */
const ListItemBlock = forwardRef<BlockRef, ListItemBlockProps>(
  function ListItemBlock(
    {
      block,
      onUpdate,
      onDelete,
      onAddAfter,
      onFocusPrevious,
      onFocusNext,
      listPosition = 1,
    },
    ref
  ) {
    const contentRef = useRef<HTMLDivElement>(null);
    const isComposing = useRef(false);
    const lastContentRef = useRef<string | null>(null);
    const isInternalUpdate = useRef(false);

    const listType = (block.props?.listType as "bullet" | "numbered" | "todo") || "bullet";
    const checked = (block.props?.checked as boolean) || false;

    // Expose focus method via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (contentRef.current) {
          contentRef.current.focus();
          // Move cursor to end
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(contentRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      },
      getElement: () => contentRef.current,
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
      if (!contentRef.current) return;

      // Skip if this is our own internal update
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }

      if (lastContentRef.current !== text) {
        const currentText = contentRef.current.textContent || "";
        if (currentText !== text || hasStyles) {
          // Save cursor position
          const selection = window.getSelection();
          let cursorOffset = 0;
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            cursorOffset = getTextOffsetInElement(contentRef.current, range.startContainer, range.startOffset);
          }

          // Update content
          if (hasStyles && styledHtml) {
            contentRef.current.innerHTML = styledHtml;
          } else {
            contentRef.current.textContent = text;
          }

          // Restore cursor position if element is focused
          if (document.activeElement === contentRef.current && text.length > 0) {
            restoreCursorPosition(contentRef.current, Math.min(cursorOffset, text.length));
          }
        }
        lastContentRef.current = text;
      }
    }, [text, hasStyles, styledHtml]);

    // Handle input changes
    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        if (isComposing.current) return;

        const newText = e.currentTarget.textContent || "";
        lastContentRef.current = newText;
        isInternalUpdate.current = true;

        const newContent: InlineContent[] = newText
          ? [{ type: "text", text: newText }]
          : [];

        onUpdate(block.id, {
          content: newContent,
        });
      },
      [block.id, onUpdate]
    );

    // Handle checkbox toggle
    const handleCheckboxClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onUpdate(block.id, {
          props: { ...block.props, checked: !checked },
        });
      },
      [block.id, block.props, checked, onUpdate]
    );

    // Handle keydown events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Enter - create new list item of same type
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          // The parent will create a new block, but we need to signal what type
          // We'll rely on the custom onAddAfter to handle this in CustomEditor
          onAddAfter(block.id);
          return;
        }

        // Backspace on empty - convert to paragraph
        if (e.key === "Backspace") {
          const selection = window.getSelection();
          const isAtStart =
            selection?.anchorOffset === 0 && selection?.focusOffset === 0;
          const isEmpty = !contentRef.current?.textContent;

          if (isEmpty || isAtStart) {
            e.preventDefault();
            // Convert to paragraph
            onUpdate(block.id, {
              type: "paragraph",
              props: {},
            });
            return;
          }
        }

        // Arrow Up at start - focus previous block
        if (e.key === "ArrowUp") {
          const selection = window.getSelection();
          if (selection?.anchorOffset === 0 && onFocusPrevious) {
            e.preventDefault();
            onFocusPrevious(block.id);
            return;
          }
        }

        // Arrow Down at end - focus next block
        if (e.key === "ArrowDown") {
          const selection = window.getSelection();
          const textLength = contentRef.current?.textContent?.length || 0;
          if (selection?.anchorOffset === textLength && onFocusNext) {
            e.preventDefault();
            onFocusNext(block.id);
            return;
          }
        }
      },
      [block.id, onAddAfter, onUpdate, onFocusPrevious, onFocusNext]
    );

    // Handle composition (for IME input)
    const handleCompositionStart = () => {
      isComposing.current = true;
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
      isComposing.current = false;
      handleInput(e as unknown as React.FormEvent<HTMLDivElement>);
    };

    // Render the marker based on list type
    const renderMarker = () => {
      switch (listType) {
        case "bullet":
          return <span className="list-marker">•</span>;
        case "numbered":
          return <span className="list-marker">{listPosition}.</span>;
        case "todo":
          return (
            <div
              className={cn("todo-checkbox", checked && "checked")}
              onClick={handleCheckboxClick}
              role="checkbox"
              aria-checked={checked}
              tabIndex={-1}
            >
              {checked && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div
        className={cn("block-list-item", checked && "checked")}
        data-block-id={block.id}
        data-block-type="listItem"
        data-list-type={listType}
      >
        {renderMarker()}
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="list-content"
          data-placeholder="List"
        />
      </div>
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

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default ListItemBlock;
