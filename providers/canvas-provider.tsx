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
import { useThreads } from "./threads-provider";

// Editor-agnostic AI Canvas API interface (can be implemented by any editor)
export interface EditorAPI {
  // Add methods here as needed for AI integration
  getBlocks?: () => unknown[];
  insertBlock?: (block: unknown, position?: number) => void;
  updateBlock?: (id: string, updates: unknown) => void;
  deleteBlock?: (id: string) => void;
}

interface CanvasContextType {
  content: CanvasContent | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  updateContent: (content: CanvasContent) => void;
  saveNow: () => Promise<void>;

  // Editor API access (editor-agnostic)
  editorApi: EditorAPI | null;
  registerEditorApi: (api: EditorAPI) => void;
  unregisterEditorApi: () => void;

  // Refresh content from database (used after external updates)
  refreshContent: () => Promise<void>;
}

const CanvasContext = createContext<CanvasContextType | undefined>(undefined);

const DEBOUNCE_MS = 1000;

export const CanvasProvider = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { activeThreadId } = useThreads();
  const [content, setContent] = useState<CanvasContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [editorApi, setEditorApi] = useState<EditorAPI | null>(null);

  // Refs to track pending saves and debounce timer
  const pendingContentRef = useRef<CanvasContent | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentThreadRef = useRef<string | null>(null);

  // Save function that persists to database
  const saveToDb = useCallback(
    async (threadId: string, contentToSave: CanvasContent) => {
      if (!isTauriContext()) return;

      setIsSaving(true);
      try {
        await dbSaveCanvasContent(threadId, contentToSave);
        setIsDirty(false);
      } catch (error) {
        console.error("Failed to save canvas content:", error);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Force save any pending content (used before thread switch)
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (
      pendingContentRef.current &&
      currentThreadRef.current &&
      isTauriContext()
    ) {
      await saveToDb(currentThreadRef.current, pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [saveToDb]);

  // Update content with debounced save
  const updateContent = useCallback(
    (newContent: CanvasContent) => {
      setContent(newContent);
      setIsDirty(true);
      pendingContentRef.current = newContent;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      if (currentThreadRef.current && isTauriContext()) {
        debounceTimerRef.current = setTimeout(() => {
          if (pendingContentRef.current && currentThreadRef.current) {
            saveToDb(currentThreadRef.current, pendingContentRef.current);
            pendingContentRef.current = null;
          }
        }, DEBOUNCE_MS);
      }
    },
    [saveToDb]
  );

  // Register editor API (editor-agnostic)
  const registerEditorApi = useCallback((api: EditorAPI) => {
    setEditorApi(api);
  }, []);

  // Unregister editor API (called on unmount)
  const unregisterEditorApi = useCallback(() => {
    setEditorApi(null);
  }, []);

  // Refresh content from database (used after external updates like AI adding blocks)
  const refreshContent = useCallback(async () => {
    if (!currentThreadRef.current || !isTauriContext()) return;

    try {
      const loadedContent = await getCanvasContent(currentThreadRef.current);
      setContent(loadedContent);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to refresh canvas content:", error);
    }
  }, []);

  // Load canvas when thread changes
  useEffect(() => {
    const loadCanvas = async () => {
      // Save pending content before switching
      if (
        pendingContentRef.current &&
        currentThreadRef.current &&
        isTauriContext()
      ) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        await saveToDb(currentThreadRef.current, pendingContentRef.current);
        pendingContentRef.current = null;
      }

      currentThreadRef.current = activeThreadId;

      if (!activeThreadId) {
        setContent(null);
        setIsLoading(false);
        setIsDirty(false);
        return;
      }

      if (!isTauriContext()) {
        setContent(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const loadedContent = await getCanvasContent(activeThreadId);
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
  }, [activeThreadId, saveToDb]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <CanvasContext.Provider
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
    </CanvasContext.Provider>
  );
};

export const useCanvas = (): CanvasContextType => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
};
