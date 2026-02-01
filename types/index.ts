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
