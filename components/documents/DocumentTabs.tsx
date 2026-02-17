"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DocumentTab, useDocuments } from "@/providers/documents-provider";

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

export default function DocumentTabs() {
  const {
    openTabs,
    activeTabId,
    setActiveTab,
    closeTab,
    reorderTabs,
    splitMode,
    splitTabId,
    enableSplit,
    disableSplit,
  } = useDocuments();

  // Drag state
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragOverSplit, setDragOverSplit] = useState(false);
  const dragStartIndex = useRef<number>(-1);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Close context menu on click outside or escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("click", handleClose);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  // --- Drag Handlers ---
  const handleDragStart = useCallback(
    (e: React.DragEvent, tab: DocumentTab, index: number) => {
      setDragTabId(tab.id);
      dragStartIndex.current = index;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", tab.id);
      // Make ghost more subtle
      if (e.currentTarget instanceof HTMLElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 40, 16);
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropIndex(index);
      setDragOverSplit(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragStartIndex.current;
      if (fromIndex >= 0 && fromIndex !== toIndex) {
        reorderTabs(fromIndex, toIndex);
      }
      setDragTabId(null);
      setDropIndex(null);
      setDragOverSplit(false);
    },
    [reorderTabs]
  );

  const handleDragEnd = useCallback(() => {
    setDragTabId(null);
    setDropIndex(null);
    setDragOverSplit(false);
  }, []);

  // Split drop zone handlers
  const handleSplitDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverSplit(true);
      setDropIndex(null);
    },
    []
  );

  const handleSplitDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const tabId = e.dataTransfer.getData("text/plain");
      if (tabId && tabId !== activeTabId) {
        enableSplit(tabId);
      }
      setDragTabId(null);
      setDropIndex(null);
      setDragOverSplit(false);
    },
    [activeTabId, enableSplit]
  );

  // --- Context Menu Handlers ---
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, tab: DocumentTab) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ tabId: tab.id, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleContextAction = useCallback(
    (action: "split" | "close") => {
      if (!contextMenu) return;
      const { tabId } = contextMenu;
      if (action === "split") {
        if (splitMode && splitTabId === tabId) {
          disableSplit();
        } else if (tabId !== activeTabId) {
          enableSplit(tabId);
        }
      } else if (action === "close") {
        closeTab(tabId);
      }
      setContextMenu(null);
    },
    [contextMenu, splitMode, splitTabId, activeTabId, enableSplit, disableSplit, closeTab]
  );

  if (openTabs.length === 0) return null;

  const contextTab = contextMenu
    ? openTabs.find((t) => t.id === contextMenu.tabId)
    : null;

  const isSplitTarget =
    contextTab && splitMode && splitTabId === contextTab.id;
  const canSplit = contextTab && contextTab.id !== activeTabId;

  return (
    <>
      <div className="document-tabs">
        <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
          {openTabs.map((tab, index) => (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              draggable
              className={cn(
                "document-tab",
                activeTabId === tab.id && "active",
                splitMode && splitTabId === tab.id && "split-active",
                dragTabId === tab.id && "dragging",
                dropIndex === index && dragTabId !== tab.id && "drop-target"
              )}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              onDragStart={(e) => handleDragStart(e, tab, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <span className="truncate max-w-32 text-xs">{tab.title}</span>
              <button
                className="document-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Open another document — shows the grid */}
          <button
            className="document-tab-add"
            onClick={() => setActiveTab(null)}
            title="Open another document"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Split drop zone — visible when dragging a non-active tab */}
        {dragTabId && dragTabId !== activeTabId && (
          <div
            className={cn(
              "document-split-drop",
              dragOverSplit && "active"
            )}
            onDragOver={handleSplitDragOver}
            onDragLeave={() => setDragOverSplit(false)}
            onDrop={handleSplitDrop}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
            <span className="text-[10px]">Split</span>
          </div>
        )}

        {/* Manual split toggle when not dragging */}
        {!dragTabId && openTabs.length >= 2 && (
          <button
            className={cn("document-split-btn", splitMode && "active")}
            onClick={() => {
              if (splitMode) {
                disableSplit();
              } else {
                const other = openTabs.find((t) => t.id !== activeTabId);
                if (other) enableSplit(other.id);
              }
            }}
            title={splitMode ? "Exit split view" : "Split view"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && contextTab && (
        <div
          className="document-tab-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {canSplit && (
            <button
              className="document-tab-context-item"
              onClick={() => handleContextAction("split")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              {isSplitTarget ? "Close Split" : "Open in Split View"}
            </button>
          )}
          {isSplitTarget && (
            <button
              className="document-tab-context-item"
              onClick={() => handleContextAction("split")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              Close Split View
            </button>
          )}
          <button
            className="document-tab-context-item destructive"
            onClick={() => handleContextAction("close")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Close Tab
          </button>
        </div>
      )}
    </>
  );
}
