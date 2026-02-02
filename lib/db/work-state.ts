/**
 * Work State Database Operations
 *
 * CRUD operations for managing thread work state in the database.
 */

import { getDb, isTauriContext } from "../db";
import {
  WorkState,
  createEmptyWorkState,
} from "@/types/work-state";

interface WorkStateRow {
  work_state: string | null;
}

/**
 * Get the work state for a thread
 * Returns null if no work state exists (thread not found)
 * Returns empty work state if thread exists but has no state yet
 */
export async function getWorkState(
  threadId: string
): Promise<WorkState | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<WorkStateRow[]>(
    "SELECT work_state FROM threads WHERE id = $1",
    [threadId]
  );

  if (rows.length === 0) {
    return null;
  }

  if (!rows[0].work_state) {
    return createEmptyWorkState();
  }

  try {
    return JSON.parse(rows[0].work_state) as WorkState;
  } catch {
    console.error("Failed to parse work state for thread:", threadId);
    return createEmptyWorkState();
  }
}

/**
 * Save the complete work state for a thread
 */
export async function saveWorkState(
  threadId: string,
  state: WorkState
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  // Update the lastUpdated timestamp
  const stateWithTimestamp: WorkState = {
    ...state,
    lastUpdated: now,
  };

  const stateJson = JSON.stringify(stateWithTimestamp);

  await db.execute(
    "UPDATE threads SET work_state = $1, updated_at = $2 WHERE id = $3",
    [stateJson, now, threadId]
  );
}

/**
 * Partially update work state fields
 * Only updates provided fields, preserving others
 */
export async function updateWorkState(
  threadId: string,
  updates: Partial<WorkState>
): Promise<WorkState> {
  const currentState = await getWorkState(threadId);

  if (!currentState) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  const updatedState: WorkState = {
    ...currentState,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);
  return updatedState;
}

/**
 * Initialize work state for a thread if it doesn't exist
 */
export async function initializeWorkState(threadId: string): Promise<WorkState> {
  const existing = await getWorkState(threadId);

  if (existing && existing.lastUpdated) {
    // Already initialized
    return existing;
  }

  const newState = createEmptyWorkState();
  await saveWorkState(threadId, newState);
  return newState;
}
