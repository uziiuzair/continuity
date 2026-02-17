"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Thread } from "@/types";
import { isTauriContext } from "@/lib/db";
import {
  createThread as dbCreateThread,
  getAllThreads,
  updateThread as dbUpdateThread,
  archiveThread as dbArchiveThread,
  updateThreadTimestamp,
} from "@/lib/db/threads";
import { useDatabase } from "./database-provider";

interface ThreadsContextProps {
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  createThread: (title: string, projectId?: string) => Promise<Thread>;
  updateThread: (threadId: string, title: string) => Promise<void>;
  archiveThread: (threadId: string) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  refreshThreads: () => Promise<void>;
  touchThread: (threadId: string) => Promise<void>;
}

const ThreadsContext = createContext<ThreadsContextProps | undefined>(
  undefined
);

const ACTIVE_THREAD_KEY = "ooozzy_active_thread_id";

export const ThreadsProvider = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isReady: dbReady } = useDatabase();

  // Load threads from database when DB is ready
  useEffect(() => {
    const loadThreads = async () => {
      if (!dbReady) return;

      if (!isTauriContext()) {
        setIsLoading(false);
        return;
      }

      try {
        const loadedThreads = await getAllThreads();
        setThreads(loadedThreads);

        // Restore active thread from localStorage
        const savedActiveId = localStorage.getItem(ACTIVE_THREAD_KEY);
        if (
          savedActiveId &&
          loadedThreads.some((t) => t.id === savedActiveId)
        ) {
          setActiveThreadId(savedActiveId);
        }
      } catch (error) {
        console.error("Failed to load threads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThreads();
  }, [dbReady]);

  // Persist active thread ID to localStorage
  useEffect(() => {
    if (activeThreadId) {
      localStorage.setItem(ACTIVE_THREAD_KEY, activeThreadId);
    } else {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  }, [activeThreadId]);

  const refreshThreads = useCallback(async () => {
    if (!isTauriContext()) return;

    try {
      const loadedThreads = await getAllThreads();
      setThreads(loadedThreads);
    } catch (error) {
      console.error("Failed to refresh threads:", error);
    }
  }, []);

  const createThread = useCallback(async (title: string, projectId?: string): Promise<Thread> => {
    if (!isTauriContext()) {
      throw new Error("Database operations require Tauri context");
    }

    const thread = await dbCreateThread(title, projectId);
    setThreads((prev) => [thread, ...prev]);
    return thread;
  }, []);

  const updateThread = useCallback(
    async (threadId: string, title: string): Promise<void> => {
      if (!isTauriContext()) {
        throw new Error("Database operations require Tauri context");
      }

      await dbUpdateThread(threadId, title);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, title, updatedAt: new Date() } : t
        )
      );
    },
    []
  );

  const archiveThread = useCallback(
    async (threadId: string): Promise<void> => {
      if (!isTauriContext()) {
        throw new Error("Database operations require Tauri context");
      }

      await dbArchiveThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));

      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
    },
    [activeThreadId]
  );

  const setActiveThread = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
  }, []);

  const touchThread = useCallback(async (threadId: string): Promise<void> => {
    if (!isTauriContext()) return;

    try {
      await updateThreadTimestamp(threadId);
      setThreads((prev) => {
        const updated = prev.map((t) =>
          t.id === threadId ? { ...t, updatedAt: new Date() } : t
        );
        // Re-sort by updatedAt
        return updated.sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      });
    } catch (error) {
      console.error("Failed to touch thread:", error);
    }
  }, []);

  return (
    <ThreadsContext.Provider
      value={{
        threads,
        activeThreadId,
        isLoading,
        createThread,
        updateThread,
        archiveThread,
        setActiveThread,
        refreshThreads,
        touchThread,
      }}
    >
      {children}
    </ThreadsContext.Provider>
  );
};

export const useThreads = (): ThreadsContextProps => {
  const context = useContext(ThreadsContext);
  if (!context) {
    throw new Error("useThreads must be used within a ThreadsProvider");
  }
  return context;
};
