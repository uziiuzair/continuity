/**
 * Plugin Host Database Connection
 *
 * Opens the app's SQLite database (test.db) using better-sqlite3.
 * WAL mode for concurrent access with the Tauri frontend.
 */

import Database from "better-sqlite3";
import { join } from "path";
import { homedir, platform } from "os";
import { existsSync } from "fs";

const APP_IDENTIFIER = "com.ooozzy.continuity";

function getAppConfigDir(): string {
  const os = platform();
  const home = homedir();
  if (os === "darwin") {
    return join(home, "Library", "Application Support", APP_IDENTIFIER);
  } else if (os === "win32") {
    return join(home, "AppData", "Roaming", APP_IDENTIFIER);
  }
  return join(home, ".config", APP_IDENTIFIER);
}

const APP_DIR = getAppConfigDir();
const APP_DB_PATH = join(APP_DIR, "test.db");
const MEMORY_DB_PATH = join(APP_DIR, "memory.db");

let appDb: Database.Database | null = null;
let memoryDb: Database.Database | null = null;

function openDb(path: string): Database.Database {
  if (!existsSync(path)) {
    throw new Error(`Database not found at ${path}. Is the Continuity app running?`);
  }

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getAppDb(): Database.Database {
  if (!appDb) {
    appDb = openDb(APP_DB_PATH);
  }
  return appDb;
}

export function getMemoryDb(): Database.Database {
  if (!memoryDb) {
    memoryDb = openDb(MEMORY_DB_PATH);
  }
  return memoryDb;
}

export function closeAll(): void {
  if (appDb) {
    appDb.close();
    appDb = null;
  }
  if (memoryDb) {
    memoryDb.close();
    memoryDb = null;
  }
}

export function getAppDbPath(): string {
  return APP_DB_PATH;
}

export function getMemoryDbPath(): string {
  return MEMORY_DB_PATH;
}
