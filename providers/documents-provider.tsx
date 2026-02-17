"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { isTauriContext } from "@/lib/db";
import {
  getAllDocuments,
  createStandaloneDocument,
  DocumentInfo,
} from "@/lib/db/threads";

export interface DocumentTab {
  id: string; // = threadId
  threadId: string;
  title: string;
}

interface DocumentsContextType {
  // Document list
  documents: DocumentInfo[];
  isLoading: boolean;
  refreshDocuments: () => Promise<void>;

  // Tab management
  openTabs: DocumentTab[];
  activeTabId: string | null;
  openDocument: (threadId: string, title: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string | null) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Split view
  splitMode: boolean;
  splitTabId: string | null;
  enableSplit: (tabId: string) => void;
  disableSplit: () => void;

  // CRUD
  createDocument: (title?: string) => Promise<string>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(
  undefined
);

export const DocumentsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openTabs, setOpenTabs] = useState<DocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    if (!isTauriContext()) {
      setIsLoading(false);
      return;
    }
    try {
      const docs = await getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load documents on mount
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const openDocument = useCallback(
    (threadId: string, title: string) => {
      // Check if tab already exists
      const existing = openTabs.find((t) => t.threadId === threadId);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      const newTab: DocumentTab = {
        id: threadId,
        threadId,
        title,
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabId(threadId);
    },
    [openTabs]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = prev.filter((t) => t.id !== tabId);

        // If closing the active tab, activate a neighbor
        if (activeTabId === tabId && next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        } else if (next.length === 0) {
          setActiveTabId(null);
        }

        // If closing the split tab, disable split
        if (splitTabId === tabId) {
          setSplitMode(false);
          setSplitTabId(null);
        }

        return next;
      });
    },
    [activeTabId, splitTabId]
  );

  const setActiveTab = useCallback((tabId: string | null) => {
    setActiveTabId(tabId);
  }, []);

  const enableSplit = useCallback(
    (tabId: string) => {
      if (tabId !== activeTabId) {
        setSplitMode(true);
        setSplitTabId(tabId);
      }
    },
    [activeTabId]
  );

  const disableSplit = useCallback(() => {
    setSplitMode(false);
    setSplitTabId(null);
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setOpenTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const createDocument = useCallback(
    async (title?: string): Promise<string> => {
      const thread = await createStandaloneDocument(title);
      await refreshDocuments();
      openDocument(thread.id, thread.title);
      return thread.id;
    },
    [refreshDocuments, openDocument]
  );

  return (
    <DocumentsContext.Provider
      value={{
        documents,
        isLoading,
        refreshDocuments,
        openTabs,
        activeTabId,
        openDocument,
        closeTab,
        setActiveTab,
        reorderTabs,
        splitMode,
        splitTabId,
        enableSplit,
        disableSplit,
        createDocument,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = (): DocumentsContextType => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error("useDocuments must be used within a DocumentsProvider");
  }
  return context;
};
