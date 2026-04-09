export interface Project {
  id: string;
  name: string;
  description: string | null;
  path: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export type MemoryType = 'decision' | 'preference' | 'context' | 'constraint' | 'pattern';
export type MemoryScope = 'global' | 'project';

export type MemorySource = 'user' | 'ai' | 'system';

export interface Memory {
  id: string;
  key: string;
  content: string;
  type: MemoryType;
  scope: MemoryScope;
  project_id: string | null;
  tags: string | null;
  metadata: string | null;
  source: MemorySource;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface MemoryVersion {
  id: string;
  memory_id: string;
  content: string;
  version: number;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

export type RelationshipType = 'related' | 'depends_on' | 'contradicts' | 'supersedes' | 'implements';

export interface MemoryLink {
  id: string;
  memory_id_a: string;
  memory_id_b: string;
  relationship_type: RelationshipType;
  created_at: string;
}

// --- Narrative System ---

export interface NarrativeSections {
  user: string;            // Who this person is, role, background
  workStyle: string;       // Communication preferences, depth, pace
  projects: string;        // Active projects and their status
  patterns: string;        // Recurring behaviors, decision patterns
  priorities: string;      // What matters most right now
  qualityCriteria: string; // What "good" looks like for this user
  learnings: LearningEntry[];  // Structured insights with confidence
}

export interface LearningEntry {
  topic: string;
  insight: string;
  confidence: number;
  source: 'conversation' | 'correction' | 'decision' | 'explicit';
  learnedAt: string;
}

export interface Narrative {
  id: string;
  scope: MemoryScope;
  project_id: string | null;
  content: string;
  sections: string;       // JSON string of NarrativeSections
  version: number;
  confidence: number;
  last_synthesized_at: string;
  memory_snapshot_hash: string | null;
  created_at: string;
  updated_at: string;
}

// --- Learning System ---

export type SignalType = 'correction' | 'preference' | 'rejection' | 'approval' | 'explicit' | 'behavioral';

export interface Learning {
  id: string;
  scope: string;
  project_id: string | null;
  signal_type: SignalType;
  observation: string;
  confidence: number;
  source_thread_id: string | null;
  source_message_id: string | null;
  absorbed_into_narrative: number;
  created_at: string;
}
