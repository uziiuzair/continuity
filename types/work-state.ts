/**
 * Work State Types for WorkspaceChatAgent
 *
 * These types define the structured state that the AI maintains for each thread,
 * tracking objectives, open loops, blockers, and decisions.
 */

export interface OpenLoop {
  id: string;
  question: string;
  context?: string;
  createdAt: string;
}

export interface Blocker {
  id: string;
  description: string;
  waitingOn: string;
  createdAt: string;
}

export interface RecentDecision {
  id: string;
  title: string;
  summary: string;
  decidedAt: string;
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface WorkState {
  objective: string;
  nextAction: string;
  openLoops: OpenLoop[];
  blockers: Blocker[];
  recentDecisions: RecentDecision[];
  confidence: ConfidenceLevel;
  lastUpdated: string;
}

/**
 * Create an empty/default work state
 */
export function createEmptyWorkState(): WorkState {
  return {
    objective: "",
    nextAction: "",
    openLoops: [],
    blockers: [],
    recentDecisions: [],
    confidence: "low",
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate a unique ID for work state items
 */
export function generateWorkStateItemId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
