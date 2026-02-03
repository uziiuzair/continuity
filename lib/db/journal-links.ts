/**
 * Journal Links Database Operations
 *
 * Bi-directional linking between journal entries and other entities
 * (threads, artifacts, spaces).
 */

import { getDb, isTauriContext } from "../db";
import {
  JournalLink,
  JournalLinkRow,
  JournalLinkType,
  LinkedEntityType,
} from "@/types/journal";

// Generate a unique ID for links
function generateLinkId(): string {
  return `jlink-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Convert database row to JournalLink
function rowToLink(row: JournalLinkRow): JournalLink {
  return {
    id: row.id,
    journalDate: row.journal_date,
    linkedType: row.linked_type as LinkedEntityType,
    linkedId: row.linked_id,
    linkType: row.link_type as JournalLinkType,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Create a link from a journal entry to another entity
 */
export async function createJournalLink(
  journalDate: string,
  linkedType: LinkedEntityType,
  linkedId: string,
  linkType: JournalLinkType
): Promise<JournalLink> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const id = generateLinkId();
  const now = new Date().toISOString();

  // Check if link already exists (prevent duplicates)
  const existing = await db.select<JournalLinkRow[]>(
    `SELECT * FROM journal_links
     WHERE journal_date = $1 AND linked_type = $2 AND linked_id = $3`,
    [journalDate, linkedType, linkedId]
  );

  if (existing.length > 0) {
    return rowToLink(existing[0]);
  }

  await db.execute(
    `INSERT INTO journal_links (id, journal_date, linked_type, linked_id, link_type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, journalDate, linkedType, linkedId, linkType, now]
  );

  return {
    id,
    journalDate,
    linkedType,
    linkedId,
    linkType,
    createdAt: new Date(now),
  };
}

/**
 * Get all links for a specific journal entry
 */
export async function getLinksForEntry(journalDate: string): Promise<JournalLink[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<JournalLinkRow[]>(
    `SELECT * FROM journal_links
     WHERE journal_date = $1
     ORDER BY created_at DESC`,
    [journalDate]
  );

  return rows.map(rowToLink);
}

/**
 * Get all journal entries that link to a specific entity (backlinks)
 */
export async function getBacklinks(
  linkedType: LinkedEntityType,
  linkedId: string
): Promise<JournalLink[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<JournalLinkRow[]>(
    `SELECT * FROM journal_links
     WHERE linked_type = $1 AND linked_id = $2
     ORDER BY journal_date DESC`,
    [linkedType, linkedId]
  );

  return rows.map(rowToLink);
}

/**
 * Delete a specific link
 */
export async function deleteJournalLink(linkId: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM journal_links WHERE id = $1", [linkId]);
}

/**
 * Delete all links for a journal entry
 */
export async function deleteAllLinksForEntry(journalDate: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM journal_links WHERE journal_date = $1", [journalDate]);
}

/**
 * Update links for a journal entry - sync with detected mentions
 * Replaces auto-detected links while preserving manual links
 */
export async function syncAutoLinks(
  journalDate: string,
  detectedLinks: Array<{ type: LinkedEntityType; id: string }>
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Delete existing auto links
  await db.execute(
    `DELETE FROM journal_links
     WHERE journal_date = $1 AND link_type = 'auto'`,
    [journalDate]
  );

  // Add new auto links
  for (const link of detectedLinks) {
    await createJournalLink(journalDate, link.type, link.id, "auto");
  }
}

/**
 * Get link counts for multiple dates (for calendar display)
 */
export async function getLinkCountsByDate(
  dates: string[]
): Promise<Record<string, number>> {
  if (!isTauriContext() || dates.length === 0) {
    return {};
  }

  const db = await getDb();
  const placeholders = dates.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await db.select<{ journal_date: string; count: number }[]>(
    `SELECT journal_date, COUNT(*) as count
     FROM journal_links
     WHERE journal_date IN (${placeholders})
     GROUP BY journal_date`,
    dates
  );

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.journal_date] = row.count;
  }
  return counts;
}
