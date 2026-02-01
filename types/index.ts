export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface MessageMetadata {
  model?: string;
  provider?: AIProvider;
  tokens?: { prompt: number; completion: number };
  error?: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  metadata?: MessageMetadata;
}

export interface ChatState {
  messages: Message[];
  hasStarted: boolean;
  isLoading: boolean;
  error?: string;
}

export type AIProvider = "openai" | "anthropic";

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

// Canvas content type (BlockNote JSON format - array of blocks)
export type CanvasContent = unknown[];

// Memory types for persistent key-value storage
export interface Memory {
  id: string;
  key: string;
  value: string;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

// Artifact types for tasks, notes, decisions
export type ArtifactType = "task" | "note" | "decision";
export type ArtifactStatus = "active" | "completed" | "archived";
export type ArtifactPriority = "low" | "medium" | "high";

export interface Artifact {
  id: string;
  threadId: string;
  type: ArtifactType;
  title: string;
  content?: unknown;
  status: ArtifactStatus;
  priority?: ArtifactPriority;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  sourceMessageId?: string;
}
