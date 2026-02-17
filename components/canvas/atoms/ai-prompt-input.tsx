"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface AIPromptInputProps {
  anchorRect: DOMRect;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const INPUT_HEIGHT = 40;
const INPUT_OFFSET = 8;

export function AIPromptInput({
  anchorRect,
  onSubmit,
  onClose,
  isLoading,
}: AIPromptInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  // Calculate position
  useEffect(() => {
    const inputWidth = containerRef.current?.offsetWidth || 300;

    let x = anchorRect.left + anchorRect.width / 2 - inputWidth / 2;
    const viewportWidth = window.innerWidth;
    if (x < 8) x = 8;
    if (x + inputWidth > viewportWidth - 8) x = viewportWidth - inputWidth - 8;

    const spaceAbove = anchorRect.top;
    const spaceNeeded = INPUT_HEIGHT + INPUT_OFFSET;

    let y: number;
    if (spaceAbove >= spaceNeeded) {
      y = anchorRect.top - INPUT_HEIGHT - INPUT_OFFSET;
    } else {
      y = anchorRect.bottom + INPUT_OFFSET;
    }

    setPosition({ x, y });
  }, [anchorRect]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (prompt.trim() && !isLoading) {
        onSubmit(prompt.trim());
      }
    },
    [prompt, isLoading, onSubmit],
  );

  const input = (
    <div
      ref={containerRef}
      className={cn("ai-prompt-input", isLoading && "loading")}
      style={{
        left: position?.x ?? -9999,
        top: position?.y ?? -9999,
        opacity: position ? 1 : 0,
      }}
    >
      <form onSubmit={handleSubmit} className="ai-prompt-input-form">
        <SparkleIcon />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI to edit..."
          disabled={isLoading}
          className="ai-prompt-input-field"
        />
        {isLoading ? (
          <div className="ai-prompt-input-spinner" />
        ) : (
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="ai-prompt-input-btn"
          >
            <ArrowIcon />
          </button>
        )}
      </form>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(input, document.body);
}

function SparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="ai-prompt-input-icon"
    >
      <path
        fill="currentColor"
        d="M12 8l1.5 3.5L17 13l-3.5 1.5L12 18l-1.5-3.5L7 13l3.5-1.5L12 8Z"
      />
    </svg>
  );
}

function ArrowIcon() {
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
        d="M5 12h14m-7-7 7 7-7 7"
      />
    </svg>
  );
}
