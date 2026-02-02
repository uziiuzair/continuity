"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { cn } from "@/lib/utils";
import { useChat } from "@/providers/chat-provider";
import { useThreads } from "@/providers/threads-provider";
import dynamic from "next/dynamic";

// Custom block editor (replaces BlockNote)
export const Editor = dynamic(() => import("./CustomEditor"), { ssr: false });

// Keep BlockNote editor for reference/fallback
export const BlockNoteEditor = dynamic(() => import("./editor"), {
  ssr: false,
});

// Default and constraints for canvas width (in pixels)
const DEFAULT_WIDTH = 800;
const MIN_WIDTH = 400;
const MAX_WIDTH_PERCENT = 0.8; // 80% of viewport

export const Canvas = () => {
  const { canvasIsOpen, setCanvasIsOpen } = useChat();
  const { threads, activeThreadId, updateThread } = useThreads();

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId),
    [threads, activeThreadId],
  );

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Resize state
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Handle resize drag
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = canvasWidth;
    },
    [canvasWidth],
  );

  // Global mouse handlers for resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate delta (negative because dragging left should increase width)
      const delta = resizeStartX.current - e.clientX;
      const newWidth = resizeStartWidth.current + delta;

      // Clamp to min/max
      const maxWidth = window.innerWidth * MAX_WIDTH_PERCENT;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth));

      setCanvasWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Sync edited title when active thread changes
  useEffect(() => {
    if (activeThread) {
      setEditedTitle(activeThread.title);
    }
  }, [activeThread]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = async () => {
    if (!activeThreadId || !editedTitle.trim()) {
      setEditedTitle(activeThread?.title || "");
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle.trim() !== activeThread?.title) {
      await updateThread(activeThreadId, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setEditedTitle(activeThread?.title || "");
      setIsEditingTitle(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setCanvasIsOpen(!canvasIsOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors cursor-pointer fixed top-4 right-4 z-60"
        aria-label={canvasIsOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: canvasIsOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <aside
        className={cn(
          "h-screen overflow-y-auto overflow-x-hidden shrink-0 flex flex-col relative",
          canvasIsOpen
            ? "border-l border-(--border-color)/50!"
            : "border-transparent",
          !isResizing && "transition-[width] duration-200 ease-out",
        )}
        style={{ width: canvasIsOpen ? canvasWidth : 0 }}
      >
        {/* Resize handle - the entire left border */}
        <div
          onMouseDown={handleResizeMouseDown}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 group",
            "hover:bg-blue-500/30 active:bg-blue-500/50",
            "transition-colors duration-150",
            isResizing && "bg-blue-500/50",
          )}
        >
          {/* Visual indicator line that appears on hover */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0",
              "group-hover:opacity-100 transition-opacity duration-150",
              isResizing && "opacity-100",
            )}
          />
        </div>

        <header className="px-6 h-16 border-b border-(--border-color) flex items-center gap-3">
          {activeThread && (
            <>
              <div>
                {/* Editable Title */}
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={handleTitleKeyDown}
                    className="flex-1 min-w-0 px-2 py-1 text-base font-medium bg-white border border-(--border-color) rounded outline-none focus:border-(--accent) focus:ring-1 focus:ring-(--accent)"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="flex-1 min-w-0 text-left px-2 py-1 text-base font-medium text-(--text-primary) hover:bg-black/5 rounded truncate transition-colors"
                  >
                    {activeThread.title}
                  </button>
                )}
              </div>

              {/* Settings Dropdown */}
              <Menu as="div" className="relative">
                <MenuButton className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                  </svg>
                </MenuButton>

                <MenuItems className="absolute left-0 mt-2 w-48 origin-top-left bg-white border border-(--border-color) rounded-md shadow-lg focus:outline-none z-50">
                  <div className="py-1">
                    <MenuItem
                      as="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-black/5"
                      onClick={() => {
                        // TODO: Clear canvas
                      }}
                    >
                      Export as Markdown
                    </MenuItem>
                    <MenuItem
                      as="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-black/5"
                      onClick={() => {
                        // TODO: Clear canvas
                      }}
                    >
                      Export as PDF
                    </MenuItem>
                    <MenuItem
                      as="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-black/5"
                      onClick={() => {
                        // TODO: Clear canvas
                      }}
                    >
                      Clear Canvas
                    </MenuItem>
                  </div>
                </MenuItems>
              </Menu>
            </>
          )}
        </header>
        <div className="w-full p-6 flex-1 min-h-0">
          <Editor />
        </div>
      </aside>
    </>
  );
};
