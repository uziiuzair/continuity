import { AIClient, AIClientConfig, AIResponse, ChatMessage } from "./types";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
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

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    // Extract system message if present
    let systemMessage: string | undefined;
    const conversationMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemMessage = msg.content;
      } else {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: conversationMessages,
    };

    if (systemMessage) {
      body.system = systemMessage;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
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

    if (!data.content || data.content.length === 0) {
      throw new Error("Anthropic API returned no content");
    }

    const textContent = data.content.find((c) => c.type === "text");
    if (!textContent) {
      throw new Error("Anthropic API returned no text content");
    }

    return {
      content: textContent.text,
      model: data.model,
      tokens: {
        prompt: data.usage.input_tokens,
        completion: data.usage.output_tokens,
      },
    };
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    // Extract system message if present
    let systemMessage: string | undefined;
    const conversationMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemMessage = msg.content;
      } else {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: conversationMessages,
      stream: true,
    };

    if (systemMessage) {
      body.system = systemMessage;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
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
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    return {
      content: accumulatedContent,
      model: this.model,
    };
  }
}

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
];
