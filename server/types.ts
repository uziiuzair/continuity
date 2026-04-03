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

export interface Memory {
  id: string;
  key: string;
  content: string;
  type: MemoryType;
  scope: MemoryScope;
  project_id: string | null;
  tags: string | null;
  metadata: string | null;
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
