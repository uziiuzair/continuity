import { AIClient, AIClientConfig, AIResponse, ChatMessage } from "./types";

interface OpenAIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OpenAIResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class OpenAIClient implements AIClient {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.openai.com/v1";

  constructor(config: AIClientConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async chat(messages: ChatMessage[]): Promise<AIResponse> {
    const openAIMessages: OpenAIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: openAIMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("OpenAI API returned no choices");
    }

    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokens: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
      },
    };
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<AIResponse> {
    const openAIMessages: OpenAIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: openAIMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error("OpenAI API returned no response body");
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
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulatedContent += delta;
            onChunk(delta);
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

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];
