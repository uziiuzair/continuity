"use client";

import {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  BlockComponentProps,
  getTextFromContent,
  textToContent,
} from "./types";
import { BlockRef } from "../Block";

const PLACEHOLDERS: Record<number, string> = {
  1: "Heading 1",
  2: "Heading 2",
  3: "Heading 3",
};

/**
 * HeadingBlock - Heading levels 1, 2, 3
 *
 * Handles:
 * - Text input and updates
 * - Enter to create new paragraph below
 * - Backspace on empty to convert to paragraph
 * - Arrow navigation between blocks
 */
const HeadingBlock = forwardRef<BlockRef, BlockComponentProps>(
  function HeadingBlock(
    {
      block,
      onUpdate,
      onDelete,
      onAddAfter,
      onFocusPrevious,
      onFocusNext,
    },
    ref
  ) {
    const elementRef = useRef<HTMLDivElement>(null);
    const isComposing = useRef(false);
    const lastContentRef = useRef<string | null>(null);

    const level = (block.props?.level as 1 | 2 | 3) || 1;

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

    // Get the text content from the block
    const text = getTextFromContent(block.content);

    // Set initial content and handle external updates
    useEffect(() => {
      if (!elementRef.current) return;

      if (lastContentRef.current !== text) {
        const currentText = elementRef.current.textContent || "";
        if (currentText !== text) {
          elementRef.current.textContent = text;
        }
        lastContentRef.current = text;
      }
    }, [text]);

    // Handle input changes
    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        if (isComposing.current) return;

        const newText = e.currentTarget.textContent || "";
        lastContentRef.current = newText;
        onUpdate(block.id, {
          content: textToContent(newText),
        });
      },
      [block.id, onUpdate]
    );

    // Handle keydown events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Enter - create new paragraph after this one
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onAddAfter(block.id);
          return;
        }

        // Backspace on empty - convert to paragraph
        if (e.key === "Backspace") {
          const selection = window.getSelection();
          const isAtStart =
            selection?.anchorOffset === 0 && selection?.focusOffset === 0;
          const isEmpty = !elementRef.current?.textContent;

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
          const textLength = elementRef.current?.textContent?.length || 0;
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
        data-block-type="heading"
        data-heading-level={level}
        className="block-heading"
        data-placeholder={PLACEHOLDERS[level]}
      />
    );
  }
);

export default HeadingBlock;
