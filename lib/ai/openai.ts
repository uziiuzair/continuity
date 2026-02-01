import {
  AIClient,
  AIClientConfig,
  AIResponse,
  ChatMessage,
  ChatOptions,
  AIToolCall,
} from "./types";

interface OpenAIMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
  }[];
  usage?: {
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

  private convertMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool" as const,
          content: msg.content,
          tool_call_id: msg.toolCallId,
        };
      }
      if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: "assistant" as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }
      return {
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      };
    });
  }

  private convertTools(options?: ChatOptions): OpenAITool[] | undefined {
    if (!options?.tools) return undefined;
    return options.tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<AIResponse> {
    const openAIMessages = this.convertMessages(messages);
    const tools = this.convertTools(options);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: openAIMessages,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      if (options?.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAIResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("OpenAI API returned no choices");
    }

    const choice = data.choices[0];
    const toolCalls: AIToolCall[] | undefined = choice.message.tool_calls?.map(
      (tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })
    );

    return {
      content: choice.message.content || "",
      model: data.model,
      tokens: data.usage
        ? {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
          }
        : undefined,
      toolCalls,
      finishReason: choice.finish_reason,
    };
  }

  async chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: ChatOptions
  ): Promise<AIResponse> {
    const openAIMessages = this.convertMessages(messages);
    const tools = this.convertTools(options);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: openAIMessages,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      if (options?.toolChoice) {
        body.tool_choice = options.toolChoice;
      }
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
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
    let finishReason: "stop" | "tool_calls" | "length" | "content_filter" = "stop";

    // Track tool calls being built up across chunks
    const toolCallsInProgress: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();

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
          const delta = parsed.choices?.[0]?.delta;
          const reason = parsed.choices?.[0]?.finish_reason;

          if (reason) {
            finishReason = reason;
          }

          // Handle text content
          if (delta?.content) {
            accumulatedContent += delta.content;
            onChunk(delta.content);
          }

          // Handle tool calls (streamed incrementally)
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index;
              if (!toolCallsInProgress.has(index)) {
                toolCallsInProgress.set(index, {
                  id: tc.id || "",
                  name: tc.function?.name || "",
                  arguments: "",
                });
              }
              const existing = toolCallsInProgress.get(index)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            }
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
              arguments: tc.arguments,
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

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];
