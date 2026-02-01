// ============================================
// CORE CHAT TYPES
// ============================================

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string; // For tool result messages
  toolCalls?: AIToolCall[]; // For assistant messages that made tool calls
}

export interface AIResponse {
  content: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
  toolCalls?: AIToolCall[]; // Tool calls requested by the model
  finishReason?: "stop" | "tool_calls" | "length" | "content_filter";
}

export interface AIClient {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse>;
  chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: ChatOptions
  ): Promise<AIResponse>;
}

export interface AIClientConfig {
  apiKey: string;
  model: string;
}

// ============================================
// TOOL CALLING TYPES
// ============================================

export interface AITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface AIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatOptions {
  tools?: AITool[];
  toolChoice?: "auto" | "none" | "required";
}

// ============================================
// CANVAS OPERATION TYPES (legacy - for code fence approach)
// ============================================

/**
 * Block types that AI can create
 */
export type AICanvasBlockType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "codeBlock"
  | "table"
  | "image";

/**
 * A block definition from AI response
 */
export interface AICanvasBlock {
  type: AICanvasBlockType;
  content: string;
  props?: {
    level?: 1 | 2 | 3; // For headings
    checked?: boolean; // For checkListItem
    language?: string; // For codeBlock
  };
}

/**
 * A canvas operation from AI response
 */
export interface AICanvasOperation {
  action: "insert" | "update" | "delete" | "replace";
  blocks?: AICanvasBlock[];
  blockId?: string; // For update/delete
}

/**
 * Result of parsing AI response for canvas operations
 */
export interface ParsedCanvasOperations {
  /** The original AI response text (without canvas blocks) */
  textContent: string;
  /** Canvas blocks to insert */
  blocks: AICanvasBlock[];
  /** Whether canvas operations were found */
  hasCanvasContent: boolean;
}
