/**
 * Briefing Service
 *
 * Aggregates data from multiple sources to provide
 * a complete briefing for the home view.
 */

import { BriefingData } from "@/types/briefing";
import {
  getActiveThreadsForBriefing,
  getThreadCount,
  getTasksByDay,
  getPendingTaskCount,
} from "@/lib/db/briefing";

/**
 * Get complete briefing data for the home view
 */
export async function getBriefingData(): Promise<BriefingData> {
  // Fetch data in parallel
  const [rightNow, thisWeek, threadCount, taskCount] = await Promise.all([
    getActiveThreadsForBriefing(3),
    getTasksByDay(),
    getThreadCount(),
    getPendingTaskCount(),
  ]);

  // Determine if user has any data (for onboarding)
  const hasData = threadCount > 0 || taskCount > 0;

  return {
    rightNow,
    thisWeek,
    hasData,
  };
}

/**
 * Check if there are any tasks in the "This Week" section
 */
export function hasThisWeekTasks(thisWeek: BriefingData["thisWeek"]): boolean {
  return (
    thisWeek.overdue.length > 0 ||
    thisWeek.today.length > 0 ||
    thisWeek.tomorrow.length > 0 ||
    thisWeek.thisWeek.length > 0 ||
    thisWeek.unscheduled.length > 0
  );
}
