/**
 * Chat API wrapper
 *
 * Register tools the AI can call, and inject system prompt segments.
 */
export class ChatAPI {
    client;
    toolHandlers = new Map();
    constructor(client) {
        this.client = client;
        // Handle incoming tool execution requests from the host
        this.client.onRequest("tool:execute", async (params) => {
            const name = params.name;
            const args = params.arguments || {};
            const handler = this.toolHandlers.get(name);
            if (!handler) {
                return { content: `Tool not found: ${name}`, isError: true };
            }
            return await handler(args);
        });
    }
    /** Register a tool that the AI can call */
    async registerTool(tool) {
        this.toolHandlers.set(tool.name, tool.handler);
        await this.client.request("chat.registerTool", {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        });
    }
    /** Remove a registered tool */
    async removeTool(name) {
        this.toolHandlers.delete(name);
        await this.client.request("chat.removeTool", { name });
    }
    /** Inject a persistent system prompt segment */
    async injectPrompt(options) {
        await this.client.request("chat.injectPrompt", { ...options });
    }
    /** Remove an injected prompt */
    async removePrompt(id) {
        await this.client.request("chat.removePrompt", { id });
    }
}
//# sourceMappingURL=chat.js.map