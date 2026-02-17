/**
 * Research Types
 *
 * Type definitions for the multi-step deep research feature.
 * Used by the research engine, orchestrator, sub-agents, and UI.
 */

export type ResearchPhase =
  | "planning"
  | "searching"
  | "reading"
  | "analyzing"
  | "synthesizing"
  | "complete"
  | "cancelled"
  | "error";

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  fullContent?: string;
  isRead: boolean;
  subQuestionId?: string;
}

export interface ResearchSubQuestion {
  id: string;
  question: string;
  status: "pending" | "in-progress" | "answered" | "error";
  searchQueries: string[];
  findings: string[];
  sources: ResearchSource[];
  agentStatus?: string;
}

export interface ResearchFinding {
  content: string;
  sourceUrl?: string;
  subQuestionId: string;
  confidence: "high" | "medium" | "low";
}

export interface ResearchProgress {
  phase: ResearchPhase;
  phaseDetail?: string;
  subQuestions: ResearchSubQuestion[];
  sources: ResearchSource[];
  findings: ResearchFinding[];
  currentRound: number;
  activeAgents: number;
  startedAt: number;
  elapsedMs: number;
}

export interface ResearchResult {
  summary: string;
  report: string;
  sources: ResearchSource[];
  subQuestions: ResearchSubQuestion[];
  totalSearches: number;
  totalUrlsRead: number;
  elapsedMs: number;
}

export interface ResearchCallbacks {
  onProgress: (progress: ResearchProgress) => void;
  onComplete: (result: ResearchResult) => void;
  onError: (error: Error) => void;
  isCancelled: () => boolean;
}

export interface ResearchConfig {
  maxRounds: number;
  maxSubAgents: number;
  maxSourcesPerAgent: number;
  maxTotalUrlReads: number;
}

export const DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  maxRounds: 3,
  maxSubAgents: 5,
  maxSourcesPerAgent: 3,
  maxTotalUrlReads: 15,
};

export interface ResearchState {
  isActive: boolean;
  progress: ResearchProgress | null;
  result: ResearchResult | null;
  error: string | null;
  messageId: string | null;
}
