/**
 * Chat API wrapper
 *
 * Register tools the AI can call, and inject system prompt segments.
 */

import type { RPCClient } from "./client.js";
import type { ToolDefinition, ToolResult, PromptOptions } from "./types.js";

export class ChatAPI {
  private toolHandlers = new Map<string, ToolDefinition["handler"]>();

  constructor(private client: RPCClient) {
    // Handle incoming tool execution requests from the host
    this.client.onRequest("tool:execute", async (params) => {
      const name = params.name as string;
      const args = (params.arguments as Record<string, unknown>) || {};

      const handler = this.toolHandlers.get(name);
      if (!handler) {
        return { content: `Tool not found: ${name}`, isError: true };
      }

      return await handler(args);
    });
  }

  /** Register a tool that the AI can call */
  async registerTool(tool: ToolDefinition): Promise<void> {
    this.toolHandlers.set(tool.name, tool.handler);

    await this.client.request("chat.registerTool", {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    });
  }

  /** Remove a registered tool */
  async removeTool(name: string): Promise<void> {
    this.toolHandlers.delete(name);
    await this.client.request("chat.removeTool", { name });
  }

  /** Inject a persistent system prompt segment */
  async injectPrompt(options: PromptOptions): Promise<void> {
    await this.client.request("chat.injectPrompt", { ...options });
  }

  /** Remove an injected prompt */
  async removePrompt(id: string): Promise<void> {
    await this.client.request("chat.removePrompt", { id });
  }
}
