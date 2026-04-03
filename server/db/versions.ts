import { getDb } from "./connection.js";
import { MemoryVersion } from "../types.js";

export function getVersionHistory(memoryId: string): MemoryVersion[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM memory_versions WHERE memory_id = ? ORDER BY version DESC`
    )
    .all(memoryId) as MemoryVersion[];
}
