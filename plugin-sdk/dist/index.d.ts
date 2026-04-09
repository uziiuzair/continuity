/**
 * @continuity/plugin-sdk
 *
 * SDK for building Continuity plugins. A plugin is a standalone process
 * that connects to the Continuity Plugin Host via WebSocket.
 *
 * Usage:
 *
 *   import { ContinuityPlugin } from '@continuity/plugin-sdk'
 *
 *   const plugin = new ContinuityPlugin()
 *
 *   plugin.events.on('memory:created', async (data) => {
 *     console.log('New memory:', data)
 *   })
 *
 *   plugin.chat.registerTool({
 *     name: 'my_tool',
 *     description: 'Does something useful',
 *     parameters: { type: 'object', properties: {}, required: [] },
 *     handler: async (args) => ({ content: 'result' })
 *   })
 *
 *   await plugin.start()
 */
import { DatabaseAPI } from "./db.js";
import { EventsAPI } from "./events.js";
import { ChatAPI } from "./chat.js";
import { UIAPI } from "./ui.js";
import { MCPAPI } from "./mcp.js";
import { SettingsAPI } from "./settings.js";
import type { PluginOptions } from "./types.js";
export declare class ContinuityPlugin {
    private client;
    private pluginId;
    private capabilities;
    /** Database access — query, execute, subscribe */
    readonly db: DatabaseAPI;
    /** Real-time event subscriptions */
    readonly events: EventsAPI;
    /** Register AI tools and inject prompts */
    readonly chat: ChatAPI;
    /** UI panels, notifications, badges */
    readonly ui: UIAPI;
    /** MCP server control */
    readonly mcp: MCPAPI;
    /** Plugin configuration */
    readonly settings: SettingsAPI;
    constructor(options?: PluginOptions);
    /**
     * Connect to the Plugin Host and register this plugin.
     * Call this after setting up tools, events, and panels.
     */
    start(): Promise<void>;
    /** Disconnect from the Plugin Host */
    stop(): Promise<void>;
    /** Declare capabilities this plugin needs (called before start) */
    declareCapabilities(caps: string[]): void;
    /** Get the plugin ID */
    getId(): string;
}
export type { ToolDefinition, ToolResult, PanelOptions, PromptOptions, NotificationOptions, PluginOptions, } from "./types.js";
export type { MCPServerInfo, MCPHostInfo } from "./mcp.js";
//# sourceMappingURL=index.d.ts.map