"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ThreadsContextProps {
  threads: Thread[];
  activeThreadId: string | null;
  addThread: (thread: Thread) => void;
  removeThread: (threadId: string) => void;
  setActiveThread: (threadId: string | null) => void;
}

const ThreadsContext = createContext<ThreadsContextProps | undefined>(
  undefined,
);

export const ThreadsProvider = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const addThread = useCallback((thread: Thread) => {
    setThreads((prev) => [...prev, thread]);
  }, []);

  const removeThread = useCallback(
    (threadId: string) => {
      setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
    },
    [activeThreadId],
  );

  const setActiveThread = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
  }, []);

  return (
    <ThreadsContext.Provider
      value={{
        threads,
        activeThreadId,
        addThread,
        removeThread,
        setActiveThread,
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
