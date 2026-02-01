export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
}

export interface AIClient {
  chat(messages: ChatMessage[]): Promise<AIResponse>;
  chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<AIResponse>;
}

export interface AIClientConfig {
  apiKey: string;
  model: string;
}
