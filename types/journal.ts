/**
 * Journal Types - TypeScript interfaces for the daily journal feature
 */

import { EditorBlock } from "@/components/canvas/blocks/types";

// Journal entry stored in database
export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  content: EditorBlock[] | null;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Database row format (snake_case from SQLite)
export interface JournalEntryRow {
  id: string;
  date: string;
  content: string | null; // JSON string
  word_count: number;
  created_at: string;
  updated_at: string;
}

// Link types for bi-directional linking
export type JournalLinkType = "auto" | "manual";
export type LinkedEntityType = "thread" | "artifact" | "space";

// Journal link stored in database
export interface JournalLink {
  id: string;
  journalDate: string;
  linkedType: LinkedEntityType;
  linkedId: string;
  linkType: JournalLinkType;
  createdAt: Date;
}

// Database row format for links
export interface JournalLinkRow {
  id: string;
  journal_date: string;
  linked_type: string;
  linked_id: string;
  link_type: string;
  created_at: string;
}

// Context state for journal provider
export interface JournalContextState {
  selectedDate: string; // YYYY-MM-DD
  currentEntry: JournalEntry | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  streak: number;
  daysWithEntries: string[]; // Array of YYYY-MM-DD strings
}

// Date utility helpers
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

export function getWeekDates(referenceDate: Date): Date[] {
  const dates: Date[] = [];
  const day = referenceDate.getDay();

  // Get Sunday of this week
  const sunday = new Date(referenceDate);
  sunday.setDate(referenceDate.getDate() - day);

  // Generate all 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    dates.push(date);
  }

  return dates;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}
