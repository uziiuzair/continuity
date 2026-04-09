/**
 * Chat API wrapper
 *
 * Register tools the AI can call, and inject system prompt segments.
 */
import type { RPCClient } from "./client.js";
import type { ToolDefinition, PromptOptions } from "./types.js";
export declare class ChatAPI {
    private client;
    private toolHandlers;
    constructor(client: RPCClient);
    /** Register a tool that the AI can call */
    registerTool(tool: ToolDefinition): Promise<void>;
    /** Remove a registered tool */
    removeTool(name: string): Promise<void>;
    /** Inject a persistent system prompt segment */
    injectPrompt(options: PromptOptions): Promise<void>;
    /** Remove an injected prompt */
    removePrompt(id: string): Promise<void>;
}
//# sourceMappingURL=chat.d.ts.map