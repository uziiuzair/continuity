import Database from "@tauri-apps/plugin-sql";

const DB_PATH = "sqlite:test.db";
let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(DB_PATH);
  }
  return dbInstance;
}

export function isTauriContext(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
