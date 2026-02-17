"use client";

import { useCallback, useEffect } from "react";
import { useDocuments } from "@/providers/documents-provider";
import DocumentCard from "./DocumentCard";
import DocumentTabs from "./DocumentTabs";
import DocumentEditor from "./DocumentEditor";
import SplitView from "./SplitView";

export default function DocumentsPage() {
  const {
    documents,
    isLoading,
    openTabs,
    activeTabId,
    splitMode,
    splitTabId,
    openDocument,
    closeTab,
    setActiveTab,
    createDocument,
    refreshDocuments,
    enableSplit,
    disableSplit,
  } = useDocuments();

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const splitTab = openTabs.find((t) => t.id === splitTabId);
  const hasOpenTabs = openTabs.length > 0;
  // Browsing mode: tabs exist but none is active (user clicked +)
  const isBrowsing = hasOpenTabs && !activeTabId;

  const handleTitleChange = useCallback(
    (threadId: string, newTitle: string) => {
      refreshDocuments();
    },
    [refreshDocuments]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "w" && activeTabId) {
        e.preventDefault();
        closeTab(activeTabId);
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "]") {
        e.preventDefault();
        const idx = openTabs.findIndex((t) => t.id === activeTabId);
        if (idx < openTabs.length - 1) {
          setActiveTab(openTabs[idx + 1].id);
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "[") {
        e.preventDefault();
        const idx = openTabs.findIndex((t) => t.id === activeTabId);
        if (idx > 0) {
          setActiveTab(openTabs[idx - 1].id);
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        if (splitMode) {
          disableSplit();
        } else if (openTabs.length >= 2) {
          const other = openTabs.find((t) => t.id !== activeTabId);
          if (other) enableSplit(other.id);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTabId, openTabs, closeTab, setActiveTab, splitMode, enableSplit, disableSplit]);

  // Grid content (shared between pure grid mode and browsing mode)
  const gridContent = (
    <div className="flex-1 overflow-y-auto px-8 pb-8">
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-sm text-(--text-secondary)">
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-(--text-secondary)/30 mb-4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p className="text-sm font-medium text-(--text-primary) mb-1">No documents yet</p>
          <p className="text-xs text-(--text-secondary)">
            Create a new document or start a chat with a canvas to see it here.
          </p>
        </div>
      ) : (
        <div className="documents-grid">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={() => openDocument(doc.id, doc.title)}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Pure grid mode (no tabs open at all)
  if (!hasOpenTabs) {
    return (
      <div className="documents-page h-full flex flex-col">
        <header className="documents-page-header">
          <h1 className="text-2xl font-semibold text-(--text-primary)" style={{ fontFamily: "var(--font-serif)" }}>
            Documents
          </h1>
          <button
            onClick={() => createDocument()}
            className="documents-new-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Document
          </button>
        </header>
        {gridContent}
      </div>
    );
  }

  // Browsing mode (tabs open, but user clicked + to browse grid)
  if (isBrowsing) {
    return (
      <div className="documents-page h-full flex flex-col">
        <header className="documents-editor-header">
          <DocumentTabs />
        </header>
        <div className="documents-browse-header">
          <h2 className="text-lg font-semibold text-(--text-primary)" style={{ fontFamily: "var(--font-serif)" }}>
            Open a document
          </h2>
          <button
            onClick={() => createDocument()}
            className="documents-new-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Document
          </button>
        </div>
        {gridContent}
      </div>
    );
  }

  // Editor mode (active tab selected)
  return (
    <div className="documents-page h-full flex flex-col">
      <header className="documents-editor-header">
        <button
          onClick={() => {
            openTabs.forEach((t) => closeTab(t.id));
          }}
          className="documents-back-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <DocumentTabs />
      </header>

      <div className="flex-1 min-h-0">
        {splitMode && activeTab && splitTab ? (
          <SplitView
            leftTab={activeTab}
            rightTab={splitTab}
            onTitleChange={handleTitleChange}
          />
        ) : activeTab ? (
          <DocumentEditor
            key={activeTab.threadId}
            threadId={activeTab.threadId}
            title={activeTab.title}
            onTitleChange={(t) => handleTitleChange(activeTab.threadId, t)}
          />
        ) : null}
      </div>
    </div>
  );
}
