"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { isTauriContext } from "@/lib/db";
import {
  getJournalEntry,
  saveJournalEntry,
  getDatesWithEntries,
  calculateStreak,
} from "@/lib/db/journal";
import {
  JournalEntry,
  formatDateKey,
  parseDateKey,
} from "@/types/journal";
import { EditorBlock } from "@/components/canvas/blocks/types";

interface JournalContextType {
  // State
  selectedDate: string; // YYYY-MM-DD
  currentEntry: JournalEntry | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  streak: number;
  daysWithEntries: string[]; // Array of YYYY-MM-DD strings

  // Actions
  setSelectedDate: (date: string) => void;
  updateContent: (blocks: EditorBlock[]) => void;
  saveNow: () => Promise<void>;
  navigateDay: (direction: "prev" | "next") => void;
  navigateWeek: (direction: "prev" | "next") => void;
  goToToday: () => void;
  refreshStreak: () => Promise<void>;
  refreshDaysWithEntries: () => Promise<void>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

const DEBOUNCE_MS = 1000;

export function JournalProvider({ children }: { children: React.ReactNode }) {
  // Get today's date as initial selected date
  const [selectedDate, setSelectedDateState] = useState<string>(() =>
    formatDateKey(new Date())
  );
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [streak, setStreak] = useState(0);
  const [daysWithEntries, setDaysWithEntries] = useState<string[]>([]);

  // Refs for debouncing
  const pendingContentRef = useRef<EditorBlock[] | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDateRef = useRef<string>(selectedDate);

  // Save function that persists to database
  const saveToDb = useCallback(
    async (date: string, content: EditorBlock[]) => {
      if (!isTauriContext()) return;

      setIsSaving(true);
      try {
        const entry = await saveJournalEntry(date, content);
        setCurrentEntry(entry);
        setIsDirty(false);

        // Refresh days with entries (entry may have been created)
        const dates = await getDatesWithEntries();
        setDaysWithEntries(dates);

        // Refresh streak
        const newStreak = await calculateStreak();
        setStreak(newStreak);
      } catch (error) {
        console.error("Failed to save journal entry:", error);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Force save any pending content
  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (pendingContentRef.current && currentDateRef.current && isTauriContext()) {
      await saveToDb(currentDateRef.current, pendingContentRef.current);
      pendingContentRef.current = null;
    }
  }, [saveToDb]);

  // Update content with debounced save
  const updateContent = useCallback(
    (newContent: EditorBlock[]) => {
      // Update the entry locally for immediate feedback
      setCurrentEntry((prev) =>
        prev
          ? { ...prev, content: newContent }
          : {
              id: "",
              date: currentDateRef.current,
              content: newContent,
              wordCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
      );
      setIsDirty(true);
      pendingContentRef.current = newContent;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      if (isTauriContext()) {
        debounceTimerRef.current = setTimeout(() => {
          if (pendingContentRef.current) {
            saveToDb(currentDateRef.current, pendingContentRef.current);
            pendingContentRef.current = null;
          }
        }, DEBOUNCE_MS);
      }
    },
    [saveToDb]
  );

  // Set selected date (with save of pending content)
  const setSelectedDate = useCallback(
    async (date: string) => {
      // Save pending content before switching
      if (pendingContentRef.current && isTauriContext()) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        await saveToDb(currentDateRef.current, pendingContentRef.current);
        pendingContentRef.current = null;
      }

      currentDateRef.current = date;
      setSelectedDateState(date);
    },
    [saveToDb]
  );

  // Navigate to previous or next day
  const navigateDay = useCallback(
    (direction: "prev" | "next") => {
      const current = parseDateKey(selectedDate);
      const delta = direction === "prev" ? -1 : 1;
      current.setDate(current.getDate() + delta);
      setSelectedDate(formatDateKey(current));
    },
    [selectedDate, setSelectedDate]
  );

  // Navigate to previous or next week
  const navigateWeek = useCallback(
    (direction: "prev" | "next") => {
      const current = parseDateKey(selectedDate);
      const delta = direction === "prev" ? -7 : 7;
      current.setDate(current.getDate() + delta);
      setSelectedDate(formatDateKey(current));
    },
    [selectedDate, setSelectedDate]
  );

  // Go to today
  const goToToday = useCallback(() => {
    setSelectedDate(formatDateKey(new Date()));
  }, [setSelectedDate]);

  // Refresh streak from database
  const refreshStreak = useCallback(async () => {
    if (!isTauriContext()) return;
    try {
      const newStreak = await calculateStreak();
      setStreak(newStreak);
    } catch (error) {
      console.error("Failed to refresh streak:", error);
    }
  }, []);

  // Refresh days with entries from database
  const refreshDaysWithEntries = useCallback(async () => {
    if (!isTauriContext()) return;
    try {
      const dates = await getDatesWithEntries();
      setDaysWithEntries(dates);
    } catch (error) {
      console.error("Failed to refresh days with entries:", error);
    }
  }, []);

  // Load entry when selected date changes
  useEffect(() => {
    const loadEntry = async () => {
      if (!isTauriContext()) {
        setCurrentEntry(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const entry = await getJournalEntry(selectedDate);
        setCurrentEntry(entry);
        setIsDirty(false);
      } catch (error) {
        console.error("Failed to load journal entry:", error);
        setCurrentEntry(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntry();
  }, [selectedDate]);

  // Load initial data (streak and days with entries)
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isTauriContext()) return;

      try {
        const [dates, streakCount] = await Promise.all([
          getDatesWithEntries(),
          calculateStreak(),
        ]);
        setDaysWithEntries(dates);
        setStreak(streakCount);
      } catch (error) {
        console.error("Failed to load initial journal data:", error);
      }
    };

    loadInitialData();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <JournalContext.Provider
      value={{
        selectedDate,
        currentEntry,
        isLoading,
        isSaving,
        isDirty,
        streak,
        daysWithEntries,
        setSelectedDate,
        updateContent,
        saveNow,
        navigateDay,
        navigateWeek,
        goToToday,
        refreshStreak,
        refreshDaysWithEntries,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal(): JournalContextType {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error("useJournal must be used within a JournalProvider");
  }
  return context;
}
