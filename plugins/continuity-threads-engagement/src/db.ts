/**
 * Plugin-Local Database
 *
 * Uses better-sqlite3 directly (not the SDK's db API) because the
 * Plugin Host blocks DDL statements. The DB file lives in the
 * plugin's install directory.
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "threads-engagement.db");

let db: Database.Database | null = null;

export interface StoredPost {
  id: string;
  text: string;
  username: string;
  permalink: string | null;
  media_type: string | null;
  posted_at: string;
  discovered_at: string;
  search_keyword: string;
  relevance_score: number;
  relevance_reason: string | null;
  status: string;
  updated_at: string;
}

export interface StoredDraft {
  id: string;
  post_id: string;
  draft_text: string;
  draft_version: number;
  is_selected: number;
  created_at: string;
}

export interface StoredEngagement {
  id: string;
  post_id: string;
  draft_id: string | null;
  reply_text: string;
  threads_reply_id: string | null;
  posted_at: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface Stats {
  totalDiscovered: number;
  totalDrafted: number;
  totalReplied: number;
  totalRejected: number;
  pendingReview: number;
  searchesThisWeek: number;
  searchBudgetRemaining: number;
  lastScanAt: string | null;
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS threads_posts (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      username TEXT NOT NULL,
      permalink TEXT,
      media_type TEXT,
      posted_at TEXT NOT NULL,
      discovered_at TEXT DEFAULT (datetime('now')),
      search_keyword TEXT NOT NULL,
      relevance_score REAL NOT NULL,
      relevance_reason TEXT,
      status TEXT DEFAULT 'pending',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON threads_posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_discovered ON threads_posts(discovered_at);

    CREATE TABLE IF NOT EXISTS threads_drafts (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES threads_posts(id),
      draft_text TEXT NOT NULL,
      draft_version INTEGER DEFAULT 1,
      is_selected INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_drafts_post ON threads_drafts(post_id);

    CREATE TABLE IF NOT EXISTS threads_engagements (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES threads_posts(id),
      draft_id TEXT,
      reply_text TEXT NOT NULL,
      threads_reply_id TEXT,
      posted_at TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS threads_search_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      result_count INTEGER DEFAULT 0,
      searched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_search_log_date ON threads_search_log(searched_at);
  `);
}

// ── Posts ──────────────────────────────────────

export function postExists(id: string): boolean {
  const row = getDb().prepare("SELECT 1 FROM threads_posts WHERE id = ?").get(id);
  return !!row;
}

export function insertPost(post: {
  id: string;
  text: string;
  username: string;
  permalink?: string;
  media_type?: string;
  posted_at: string;
  search_keyword: string;
  relevance_score: number;
  relevance_reason?: string;
}): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO threads_posts (id, text, username, permalink, media_type, posted_at, search_keyword, relevance_score, relevance_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    post.id, post.text, post.username, post.permalink ?? null,
    post.media_type ?? null, post.posted_at, post.search_keyword,
    post.relevance_score, post.relevance_reason ?? null
  );
}

export function getPostsByStatus(status: string, limit = 20, offset = 0): StoredPost[] {
  if (status === "all") {
    return getDb().prepare(
      "SELECT * FROM threads_posts ORDER BY discovered_at DESC LIMIT ? OFFSET ?"
    ).all(limit, offset) as StoredPost[];
  }
  return getDb().prepare(
    "SELECT * FROM threads_posts WHERE status = ? ORDER BY discovered_at DESC LIMIT ? OFFSET ?"
  ).all(status, limit, offset) as StoredPost[];
}

export function getPostById(id: string): StoredPost | undefined {
  return getDb().prepare("SELECT * FROM threads_posts WHERE id = ?").get(id) as StoredPost | undefined;
}

export function updatePostStatus(id: string, status: string): void {
  getDb().prepare(
    "UPDATE threads_posts SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id);
}

export function countPostsByStatus(status: string): number {
  if (status === "all") {
    return (getDb().prepare("SELECT COUNT(*) as count FROM threads_posts").get() as { count: number }).count;
  }
  return (getDb().prepare("SELECT COUNT(*) as count FROM threads_posts WHERE status = ?").get(status) as { count: number }).count;
}

// ── Drafts ────────────────────────────────────

export function insertDraft(postId: string, text: string, version = 1): string {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO threads_drafts (id, post_id, draft_text, draft_version) VALUES (?, ?, ?, ?)
  `).run(id, postId, text, version);
  return id;
}

export function getDraftsForPost(postId: string): StoredDraft[] {
  return getDb().prepare(
    "SELECT * FROM threads_drafts WHERE post_id = ? ORDER BY draft_version"
  ).all(postId) as StoredDraft[];
}

export function updateDraftText(id: string, text: string): void {
  getDb().prepare("UPDATE threads_drafts SET draft_text = ? WHERE id = ?").run(text, id);
}

export function selectDraft(draftId: string, postId: string): void {
  getDb().prepare("UPDATE threads_drafts SET is_selected = 0 WHERE post_id = ?").run(postId);
  getDb().prepare("UPDATE threads_drafts SET is_selected = 1 WHERE id = ?").run(draftId);
}

export function getSelectedDraft(postId: string): StoredDraft | undefined {
  return getDb().prepare(
    "SELECT * FROM threads_drafts WHERE post_id = ? AND is_selected = 1"
  ).get(postId) as StoredDraft | undefined;
}

export function deleteDraftsForPost(postId: string): void {
  getDb().prepare("DELETE FROM threads_drafts WHERE post_id = ?").run(postId);
}

// ── Engagements ───────────────────────────────

export function insertEngagement(postId: string, draftId: string | null, replyText: string): string {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO threads_engagements (id, post_id, draft_id, reply_text) VALUES (?, ?, ?, ?)
  `).run(id, postId, draftId, replyText);
  return id;
}

export function updateEngagement(id: string, updates: {
  threads_reply_id?: string;
  posted_at?: string;
  status?: string;
  error?: string;
}): void {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (updates.threads_reply_id !== undefined) { sets.push("threads_reply_id = ?"); params.push(updates.threads_reply_id); }
  if (updates.posted_at !== undefined) { sets.push("posted_at = ?"); params.push(updates.posted_at); }
  if (updates.status !== undefined) { sets.push("status = ?"); params.push(updates.status); }
  if (updates.error !== undefined) { sets.push("error = ?"); params.push(updates.error); }

  if (sets.length === 0) return;
  params.push(id);
  getDb().prepare(`UPDATE threads_engagements SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

// ── Search Log ────────────────────────────────

export function logSearch(keyword: string, resultCount: number): void {
  getDb().prepare(
    "INSERT INTO threads_search_log (keyword, result_count) VALUES (?, ?)"
  ).run(keyword, resultCount);
}

export function getSearchCountLast7Days(): number {
  const row = getDb().prepare(
    "SELECT COUNT(*) as count FROM threads_search_log WHERE searched_at >= datetime('now', '-7 days')"
  ).get() as { count: number };
  return row.count;
}

// ── Stats ─────────────────────────────────────

export function getStats(): Stats {
  const d = getDb();
  const totalDiscovered = (d.prepare("SELECT COUNT(*) as c FROM threads_posts").get() as { c: number }).c;
  const totalDrafted = (d.prepare("SELECT COUNT(*) as c FROM threads_posts WHERE status = 'drafted'").get() as { c: number }).c;
  const totalReplied = (d.prepare("SELECT COUNT(*) as c FROM threads_posts WHERE status = 'replied'").get() as { c: number }).c;
  const totalRejected = (d.prepare("SELECT COUNT(*) as c FROM threads_posts WHERE status IN ('rejected', 'skipped')").get() as { c: number }).c;
  const pendingReview = (d.prepare("SELECT COUNT(*) as c FROM threads_posts WHERE status IN ('pending', 'drafted')").get() as { c: number }).c;
  const searchesThisWeek = getSearchCountLast7Days();

  const lastRow = d.prepare(
    "SELECT searched_at FROM threads_search_log ORDER BY searched_at DESC LIMIT 1"
  ).get() as { searched_at: string } | undefined;

  return {
    totalDiscovered,
    totalDrafted,
    totalReplied,
    totalRejected,
    pendingReview,
    searchesThisWeek,
    searchBudgetRemaining: Math.max(0, 500 - searchesThisWeek),
    lastScanAt: lastRow?.searched_at ?? null,
  };
}
