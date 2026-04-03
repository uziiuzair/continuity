import Database from "better-sqlite3";
import { join } from "path";
import { homedir, platform } from "os";
import { mkdirSync, existsSync } from "fs";

// Must match Tauri's app_config_dir so the desktop app can read via plugin-sql.
// Tauri uses: ~/Library/Application Support/<identifier> on macOS
const APP_IDENTIFIER = "com.ooozzy.continuity";

function getAppConfigDir(): string {
  const os = platform();
  const home = homedir();
  if (os === "darwin") {
    return join(home, "Library", "Application Support", APP_IDENTIFIER);
  } else if (os === "win32") {
    return join(home, "AppData", "Roaming", APP_IDENTIFIER);
  }
  // Linux: ~/.config/<identifier>
  return join(home, ".config", APP_IDENTIFIER);
}

const APP_DIR = getAppConfigDir();
const DB_PATH = join(APP_DIR, "memory.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure app config dir exists
    if (!existsSync(APP_DIR)) {
      mkdirSync(APP_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Enable WAL mode for concurrent access (Tauri app reads while server writes)
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("foreign_keys = ON");
  }

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getDbPath(): string {
  return DB_PATH;
}
