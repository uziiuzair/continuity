/**
 * Journal Database Operations
 *
 * CRUD operations for journal entries - daily notes with auto-save.
 */

import { getDb, isTauriContext } from "../db";
import {
  JournalEntry,
  JournalEntryRow,
  formatDateKey,
} from "@/types/journal";
import { EditorBlock, getTextFromContent } from "@/components/canvas/blocks/types";

// Generate a unique ID for new entries
function generateEntryId(): string {
  return `journal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate word count from editor blocks
function calculateWordCount(blocks: EditorBlock[] | null): number {
  if (!blocks || blocks.length === 0) return 0;

  let totalWords = 0;
  for (const block of blocks) {
    const text = getTextFromContent(block.content);
    if (text) {
      // Count words by splitting on whitespace
      const words = text.trim().split(/\s+/).filter(Boolean);
      totalWords += words.length;
    }
    // Recursively count children
    if (block.children && block.children.length > 0) {
      totalWords += calculateWordCount(block.children);
    }
  }
  return totalWords;
}

// Convert database row to JournalEntry
function rowToEntry(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    date: row.date,
    content: row.content ? JSON.parse(row.content) : null,
    wordCount: row.word_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Get a journal entry for a specific date
 */
export async function getJournalEntry(date: string): Promise<JournalEntry | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<JournalEntryRow[]>(
    "SELECT * FROM journal_entries WHERE date = $1",
    [date]
  );

  if (rows.length === 0) return null;
  return rowToEntry(rows[0]);
}

/**
 * Get a journal entry by ID
 */
export async function getJournalEntryById(id: string): Promise<JournalEntry | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<JournalEntryRow[]>(
    "SELECT * FROM journal_entries WHERE id = $1",
    [id]
  );

  if (rows.length === 0) return null;
  return rowToEntry(rows[0]);
}

/**
 * Create or update a journal entry for a specific date
 * Uses UPSERT pattern - creates if doesn't exist, updates if exists
 */
export async function saveJournalEntry(
  date: string,
  content: EditorBlock[]
): Promise<JournalEntry> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const wordCount = calculateWordCount(content);
  const contentJson = JSON.stringify(content);
  const now = new Date().toISOString();

  // Check if entry exists
  const existing = await getJournalEntry(date);

  if (existing) {
    // Update existing entry
    await db.execute(
      `UPDATE journal_entries
       SET content = $1, word_count = $2, updated_at = $3
       WHERE date = $4`,
      [contentJson, wordCount, now, date]
    );

    return {
      ...existing,
      content,
      wordCount,
      updatedAt: new Date(now),
    };
  } else {
    // Create new entry
    const id = generateEntryId();
    await db.execute(
      `INSERT INTO journal_entries (id, date, content, word_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, date, contentJson, wordCount, now, now]
    );

    return {
      id,
      date,
      content,
      wordCount,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }
}

/**
 * Get all dates that have journal entries (for calendar indicators)
 */
export async function getDatesWithEntries(): Promise<string[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<{ date: string }[]>(
    "SELECT date FROM journal_entries WHERE word_count > 0 ORDER BY date DESC"
  );

  return rows.map((row) => row.date);
}

/**
 * Get entries in a date range (for streak calculation)
 */
export async function getEntriesInRange(
  startDate: string,
  endDate: string
): Promise<JournalEntry[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<JournalEntryRow[]>(
    `SELECT * FROM journal_entries
     WHERE date >= $1 AND date <= $2 AND word_count > 0
     ORDER BY date DESC`,
    [startDate, endDate]
  );

  return rows.map(rowToEntry);
}

/**
 * Calculate weekday streak (consecutive weekdays with entries)
 * Weekends don't break the streak, only missing weekdays do
 */
export async function calculateStreak(): Promise<number> {
  if (!isTauriContext()) {
    return 0;
  }

  const db = await getDb();

  // Get all entries with content, ordered by date descending
  const rows = await db.select<{ date: string }[]>(
    "SELECT date FROM journal_entries WHERE word_count > 0 ORDER BY date DESC"
  );

  if (rows.length === 0) return 0;

  const entriesSet = new Set(rows.map((r) => r.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  // Check backwards from today
  while (true) {
    const dateKey = formatDateKey(checkDate);
    const dayOfWeek = checkDate.getDay();
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;

    if (isWeekday) {
      if (entriesSet.has(dateKey)) {
        streak++;
      } else {
        // Missed a weekday - streak breaks
        // But only if we're checking past days, not today
        if (checkDate < today || !entriesSet.has(formatDateKey(today))) {
          break;
        }
        break;
      }
    }
    // Skip weekends - they don't break or add to streak

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);

    // Don't check more than 365 days back
    const daysDiff = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) break;
  }

  return streak;
}

/**
 * Delete a journal entry (soft delete - just clear content)
 * We keep the row for history tracking
 */
export async function clearJournalEntry(date: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `UPDATE journal_entries
     SET content = NULL, word_count = 0, updated_at = $1
     WHERE date = $2`,
    [now, date]
  );
}

/**
 * Get recent entries (for quick access or suggestions)
 */
export async function getRecentEntries(limit: number = 10): Promise<JournalEntry[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<JournalEntryRow[]>(
    `SELECT * FROM journal_entries
     WHERE word_count > 0
     ORDER BY date DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map(rowToEntry);
}
