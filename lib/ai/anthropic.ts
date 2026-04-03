import {
  AIClient,
  AIClientConfig,
  AIResponse,
  ChatMessage,
  ChatOptions,
  AIToolCall,
} from "./types";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicClient implements AIClient {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.anthropic.com/v1";

  constructor(config: AIClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private convertMessages(messages: ChatMessage[]): {
    system?: string;
    messages: AnthropicMessage[];
  } {
    let systemMessage: string | undefined;
    const conversationMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        // Combine multiple system messages
        systemMessage = systemMessage
          ? systemMessage + "\n\n" + msg.content
          : msg.content;
      } else if (msg.role === "tool") {
        // Tool results need to be in user messages with tool_result content blocks
        conversationMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.toolCallId,
              content: msg.content,
            },
          ],
        });
      } else if (msg.role === "assistant") {
        // If assistant message has tool calls, include them as content blocks
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const contentBlocks: AnthropicContentBlock[] = [];

          // Add text content if present
          if (msg.content) {
            contentBlocks.push({ type: "text", text: msg.content });
          }

          // Add tool use blocks
          for (const tc of msg.toolCalls) {
            contentBlocks.push({
              type: "tool_use",
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments || "{}"),
            });
          }

          conversationMessages.push({
            role: "assistant",
            content: contentBlocks,
          });
        } else {
          conversationMessages.push({
            role: "assistant",
            content: msg.content,
          });
        }
      } else {
        conversationMessages.push({
          role: "user",
          content: msg.content,
        });
      }
    }

    return { system: systemMessage, messages: conversationMessages };
  }

  private convertTools(options?: ChatOptions): AnthropicTool[] | undefined {
    if (!options?.tools) return undefined;
    return options.tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: {
        type: "object" as const,
        properties: tool.function.parameters.properties,
        required: tool.function.parameters.required,
      },
    }));
  }

  async chat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): Promise<AIResponse> {
    const { system, messages: conversationMessages } =
      this.convertMessages(messages);
    const tools = this.convertTools(options);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: conversationMessages,
    };

    if (system) {
      body.system = system;
    }

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await tauriFetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data: AnthropicResponse = await response.json();

    // Extract text content and tool uses
    let textContent = "";
    const toolCalls: AIToolCall[] = [];

    for (const block of data.content) {
      if (block.type === "text" && block.text) {
        textContent += block.text;
      } else if (block.type === "tool_use" && block.id && block.name) {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input || {}),
          },
        });
      }
    }

    return {
      content: textContent,
      model: data.model,
      tokens: {
        prompt: data.usage.input_tokens,
        completion: data.usage.output_tokens,
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: data.stop_reason === "tool_use" ? "tool_calls" : "stop",
    };
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: ChatOptions,
  ): Promise<AIResponse> {
    const { system, messages: conversationMessages } =
      this.convertMessages(messages);
    const tools = this.convertTools(options);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: conversationMessages,
      stream: true,
    };

    if (system) {
      body.system = system;
    }

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await tauriFetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("Anthropic API returned no response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = "";
    let buffer = "";
    let finishReason: "stop" | "tool_calls" = "stop";

    // Track tool uses being built up
    const toolCallsInProgress: Map<
      number,
      { id: string; name: string; input: string }
    > = new Map();
    let currentToolIndex = -1;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

        const data = trimmedLine.slice(6);

        try {
          const parsed = JSON.parse(data);

          // Handle text deltas
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta"
          ) {
            const text = parsed.delta.text;
            if (text) {
              accumulatedContent += text;
              onChunk(text);
            }
          }

          // Handle tool use start
          if (
            parsed.type === "content_block_start" &&
            parsed.content_block?.type === "tool_use"
          ) {
            currentToolIndex++;
            toolCallsInProgress.set(currentToolIndex, {
              id: parsed.content_block.id || "",
              name: parsed.content_block.name || "",
              input: "",
            });
          }

          // Handle tool use input delta
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "input_json_delta"
          ) {
            const existing = toolCallsInProgress.get(currentToolIndex);
            if (existing && parsed.delta.partial_json) {
              existing.input += parsed.delta.partial_json;
            }
          }

          // Handle message delta for stop reason
          if (parsed.type === "message_delta" && parsed.delta?.stop_reason) {
            finishReason =
              parsed.delta.stop_reason === "tool_use" ? "tool_calls" : "stop";
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    // Convert accumulated tool calls
    const toolCalls: AIToolCall[] | undefined =
      toolCallsInProgress.size > 0
        ? Array.from(toolCallsInProgress.values()).map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: tc.input,
            },
          }))
        : undefined;

    return {
      content: accumulatedContent,
      model: this.model,
      toolCalls,
      finishReason,
    };
  }
}

export const ANTHROPIC_MODELS = [
  // Latest 4.5 models
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },

  // Previous 4.x models (legacy)
  { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1 (Legacy)" },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4 (Legacy)" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4 (Legacy)" },

  // Older 3.x models (legacy)
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet (Legacy)" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (Legacy)" },
];
