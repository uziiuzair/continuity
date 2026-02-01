import { getAIConfig } from "../db/settings";
import { AIClient } from "./types";
import { OpenAIClient } from "./openai";
import { AnthropicClient } from "./anthropic";

export async function getAIClient(): Promise<AIClient | null> {
  const config = await getAIConfig();

  if (!config) {
    return null;
  }

  switch (config.provider) {
    case "openai":
      return new OpenAIClient({
        apiKey: config.apiKey,
        model: config.model,
      });
    case "anthropic":
      return new AnthropicClient({
        apiKey: config.apiKey,
        model: config.model,
      });
    default:
      return null;
  }
}

export type { AIClient, ChatMessage, AIResponse } from "./types";
export { OPENAI_MODELS } from "./openai";
export { ANTHROPIC_MODELS } from "./anthropic";
