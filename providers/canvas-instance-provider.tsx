"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CanvasContent } from "@/types";
import { isTauriContext } from "@/lib/db";
import {
  getCanvasContent,
  saveCanvasContent as dbSaveCanvasContent,
} from "@/lib/db/canvas";

// Re-use the same context shape so useCanvas() resolves to whichever provider is nearest
import { EditorAPI } from "./canvas-provider";

interface CanvasContextType {
  content: CanvasContent | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  updateContent: (content: CanvasContent) => void;
  saveNow: () => Promise<void>;
  editorApi: EditorAPI | null;
  registerEditorApi: (api: EditorAPI) => void;
  unregisterEditorApi: () => void;
  refreshContent: () => Promise<void>;
}

// We import the same CanvasContext from canvas-provider to shadow it
// But since CanvasContext is not exported, we create our own context
// that useCanvas() from canvas-provider won't pick up.
// Instead, we'll provide a useCanvasInstance hook AND re-export via the same context.

// Actually, the plan says to use the SAME CanvasContext.
// Since CanvasContext is not exported from canvas-provider, we need to
// create a parallel context. The key insight: CustomEditor uses useCanvas()
// which calls useContext(CanvasContext). Since CanvasContext is module-scoped
// in canvas-provider.tsx, we can't shadow it from here.
//
// Solution: We export our own context and update CustomEditor to check both.
// OR simpler: export CanvasContext from canvas-provider.tsx

// Simpler approach: this provider creates its own context, and the
// DocumentEditor wrapper will pass threadId to CustomEditor which will
// use the instance provider's context when available.

const CanvasInstanceContext = createContext<CanvasContextType | undefined>(
  undefined
);

const DEBOUNCE_MS = 1000;

interface Props {
  threadId: string;
  children: React.ReactNode;
}

export const CanvasInstanceProvider = ({ threadId, children }: Props) => {
  const [content, setContent] = useState<CanvasContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [editorApi, setEditorApi] = useState<EditorAPI | null>(null);

  const pendingContentRef = useRef<CanvasContent | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentThreadRef = useRef<string>(threadId);

  // Keep ref in sync
  useEffect(() => {
    currentThreadRef.current = threadId;
  }, [threadId]);

  const saveToDb = useCallback(
    async (tid: string, contentToSave: CanvasContent) => {
      if (!isTauriContext()) return;
      setIsSaving(true);
      try {
        await dbSaveCanvasContent(tid, contentToSave);
        setIsDirty(false);
      } catch (error) {
        console.error("Failed to save canvas content:", error);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingContentRef.current && isTauriContext()) {
      await saveToDb(currentThreadRef.current, pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [saveToDb]);

  const updateContent = useCallback(
    (newContent: CanvasContent) => {
      setContent(newContent);
      setIsDirty(true);
      pendingContentRef.current = newContent;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (isTauriContext()) {
        debounceTimerRef.current = setTimeout(() => {
          if (pendingContentRef.current) {
            saveToDb(currentThreadRef.current, pendingContentRef.current);
            pendingContentRef.current = null;
          }
        }, DEBOUNCE_MS);
      }
    },
    [saveToDb]
  );

  const registerEditorApi = useCallback((api: EditorAPI) => {
    setEditorApi(api);
  }, []);

  const unregisterEditorApi = useCallback(() => {
    setEditorApi(null);
  }, []);

  const refreshContent = useCallback(async () => {
    if (!isTauriContext()) return;
    try {
      const loadedContent = await getCanvasContent(currentThreadRef.current);
      setContent(loadedContent);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to refresh canvas content:", error);
    }
  }, []);

  // Load canvas on mount / threadId change
  useEffect(() => {
    const loadCanvas = async () => {
      // Save any pending content before switching
      if (pendingContentRef.current && isTauriContext()) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        await saveToDb(currentThreadRef.current, pendingContentRef.current);
        pendingContentRef.current = null;
      }

      if (!isTauriContext()) {
        setContent(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const loadedContent = await getCanvasContent(threadId);
        setContent(loadedContent);
        setIsDirty(false);
      } catch (error) {
        console.error("Failed to load canvas content:", error);
        setContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCanvas();
  }, [threadId, saveToDb]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Force save on unmount
      if (pendingContentRef.current && isTauriContext()) {
        dbSaveCanvasContent(
          currentThreadRef.current,
          pendingContentRef.current
        ).catch(() => {});
      }
    };
  }, []);

  return (
    <CanvasInstanceContext.Provider
      value={{
        content,
        isLoading,
        isSaving,
        isDirty,
        updateContent,
        saveNow,
        editorApi,
        registerEditorApi,
        unregisterEditorApi,
        refreshContent,
      }}
    >
      {children}
    </CanvasInstanceContext.Provider>
  );
};

export const useCanvasInstance = (): CanvasContextType => {
  const context = useContext(CanvasInstanceContext);
  if (!context) {
    throw new Error(
      "useCanvasInstance must be used within a CanvasInstanceProvider"
    );
  }
  return context;
};
