"use client";

import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import { Highlight, themes } from "prism-react-renderer";
import { BlockComponentProps, getTextFromContent } from "./types";
import { BlockRef } from "../Block";
import { Select } from "@/components/atoms";

const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "sql",
  "json",
  "html",
  "css",
  "bash",
  "markdown",
  "yaml",
  "go",
  "rust",
  "java",
  "plaintext",
] as const;

const CodeBlock = forwardRef<BlockRef, BlockComponentProps>(function CodeBlock(
  { block, onUpdate, onDelete, onFocusPrevious, onFocusNext },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const language = (block.props?.language as string) || "plaintext";
  const code =
    typeof block.content === "string"
      ? block.content
      : getTextFromContent(block.content);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsEditing(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    getElement: () => textareaRef.current,
  }));

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code).catch((err) => {
      console.error("Failed to copy code to clipboard:", err);
    });
  }, [code]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(block.id, { content: e.target.value });
    },
    [block.id, onUpdate],
  );

  const handleLanguageChange = useCallback(
    (e: string) => {
      onUpdate(block.id, { props: { ...block.props, language: e } });
    },
    [block.id, block.props, onUpdate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = code.substring(0, start) + "  " + code.substring(end);
        onUpdate(block.id, { content: newValue });
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        }, 0);
      }
      if (e.key === "Escape") {
        setIsEditing(false);
      }
      if (e.key === "Backspace" && !code) {
        e.preventDefault();
        onDelete(block.id);
      }
      if (
        e.key === "ArrowUp" &&
        e.currentTarget instanceof HTMLTextAreaElement
      ) {
        const textarea = e.currentTarget;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = code.substring(0, cursorPos);
        const isFirstLine = !textBeforeCursor.includes("\n");
        if (isFirstLine && onFocusPrevious) {
          e.preventDefault();
          onFocusPrevious(block.id);
        }
      }
      if (
        e.key === "ArrowDown" &&
        e.currentTarget instanceof HTMLTextAreaElement
      ) {
        const textarea = e.currentTarget;
        const cursorPos = textarea.selectionStart;
        const textAfterCursor = code.substring(cursorPos);
        const isLastLine = !textAfterCursor.includes("\n");
        if (isLastLine && onFocusNext) {
          e.preventDefault();
          onFocusNext(block.id);
        }
      }
    },
    [block.id, code, onUpdate, onDelete, onFocusPrevious, onFocusNext],
  );

  return (
    <div className="block-code" data-block-id={block.id} data-block-type="code">
      <div className="code-header">
        <div className="flex items-center gap-4">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-600/5 active:bg-slate-600/10 transition-colors cursor-pointer text-slate-600"
            onClick={handleCopyCode}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="size-5"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M7.5 3h7.1c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C21 6.04 21 7.16 21 9.4v7.1M6.2 21h8.1c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874c.218-.428.218-.988.218-2.108V9.7c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874C15.98 6.5 15.42 6.5 14.3 6.5H6.2c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C3 8.02 3 8.58 3 9.7v8.1c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874C4.52 21 5.08 21 6.2 21"
              />
            </svg>
          </button>

          <Select
            options={LANGUAGES.map((lang) => ({ name: lang, id: lang }))}
            value={language}
            onChange={(e) => handleLanguageChange(e)}
            className="w-48"
          />
        </div>
      </div>

      <div className="code-content" onClick={() => setIsEditing(true)}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setIsEditing(false)}
            className="code-textarea"
            spellCheck={false}
            placeholder="// Enter code..."
            autoFocus
          />
        ) : (
          <Highlight
            theme={themes.github}
            code={code || "// Enter code..."}
            language={language}
          >
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={`code-highlighted ${!code ? "empty" : ""}`}
                style={style}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        )}
      </div>
    </div>
  );
});

export default CodeBlock;
