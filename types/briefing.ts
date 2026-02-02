/**
 * Briefing Types
 *
 * Types for the Home Briefing View that shows:
 * - Right Now: Active threads with objectives
 * - This Week: Tasks bucketed by day
 */

import { WorkState } from "./work-state";

/**
 * An active thread for the "Right Now" section
 */
export interface ActiveThread {
  id: string;
  title: string;
  objective?: string; // From WorkState
  nextAction?: string; // From WorkState
  updatedAt: Date;
}

/**
 * A task from database_rows for the "This Week" section
 */
export interface BriefingTask {
  id: string; // database_row.id
  title: string; // From "Name" or "Task" column
  status?: string; // Option value from status column
  isDone: boolean; // Derived from status
  dueDate?: Date; // From date column
  threadId: string;
  databaseTitle: string;
}

/**
 * Tasks grouped by due date bucket
 */
export interface TasksByDay {
  overdue: BriefingTask[];
  today: BriefingTask[];
  tomorrow: BriefingTask[];
  thisWeek: BriefingTask[]; // Rest of week
  unscheduled: BriefingTask[];
}

/**
 * Complete briefing data for the home view
 */
export interface BriefingData {
  rightNow: ActiveThread[]; // Max 3
  thisWeek: TasksByDay;
  hasData: boolean; // For onboarding detection
}

/**
 * Raw thread row with work_state for queries
 */
export interface ThreadWithWorkState {
  id: string;
  title: string;
  updatedAt: Date;
  workState: WorkState | null;
}
