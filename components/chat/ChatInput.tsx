"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActivityState } from "@/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  onResearch?: (question: string) => void;
  activityState?: ActivityState;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  onResearch,
  activityState = 'idle',
  placeholder = "Send a message...",
}: ChatInputProps) {
  // Derive disabled from activity state
  const disabled = activityState !== 'idle';
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !disabled) {
      onSend(value);
      setValue("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, disabled, onSend]);

  const handleResearch = useCallback(() => {
    if (value.trim() && !disabled && onResearch) {
      onResearch(value);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, disabled, onResearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col gap-1.5 rounded-2xl border bg-white border-[#d7d6d2]!">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none outline-none text-base leading-6 placeholder:text-stone-400 min-h-6 max-h-50 px-5 pt-5 pb-3 w-full bg-transparent"
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            {/* Research button */}
            {onResearch && (
              <button
                onClick={handleResearch}
                disabled={disabled || !value.trim()}
                className={cn(
                  "size-9 flex items-center justify-center rounded-xl transition-all shrink-0",
                  value.trim() && !disabled
                    ? "text-(--text-primary) hover:bg-stone-100 cursor-pointer"
                    : "text-(--text-secondary)/40 cursor-default"
                )}
                aria-label="Deep Research"
                title="Deep Research"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.73-3.558"
                  />
                </svg>
              </button>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={cn(
              "size-9 flex items-center justify-center rounded-xl transition-all shrink-0",
              value.trim() && !disabled ? "bg-(--accent)" : "bg-stone-100",
              value.trim() && !disabled
                ? "text-white"
                : "text-(--text-secondary)",
            )}
            aria-label="Send message"
          >
            {disabled ? (
              <LoadingSpinner />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      <p className="text-xs text-center mt-4 text-(--text-secondary)/75">
        Press Enter to send, Shift+Enter for new line
      </p>
    </motion.div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
