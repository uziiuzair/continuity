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

import { RPCClient } from "./client.js";
import { DatabaseAPI } from "./db.js";
import { EventsAPI } from "./events.js";
import { ChatAPI } from "./chat.js";
import { UIAPI } from "./ui.js";
import { MCPAPI } from "./mcp.js";
import { SettingsAPI } from "./settings.js";
import type { PluginOptions } from "./types.js";

export class ContinuityPlugin {
  private client: RPCClient;
  private pluginId: string;
  private capabilities: string[] = [];

  /** Database access — query, execute, subscribe */
  public readonly db: DatabaseAPI;
  /** Real-time event subscriptions */
  public readonly events: EventsAPI;
  /** Register AI tools and inject prompts */
  public readonly chat: ChatAPI;
  /** UI panels, notifications, badges */
  public readonly ui: UIAPI;
  /** MCP server control */
  public readonly mcp: MCPAPI;
  /** Plugin configuration */
  public readonly settings: SettingsAPI;

  constructor(options?: PluginOptions) {
    const hostUrl = options?.hostUrl || process.env.CONTINUITY_HOST_URL;
    const authToken = options?.authToken || process.env.CONTINUITY_AUTH_TOKEN;
    this.pluginId = options?.pluginId || process.env.CONTINUITY_PLUGIN_ID || "unknown";

    if (!hostUrl) {
      throw new Error(
        "Plugin Host URL not found. Set CONTINUITY_HOST_URL env var or pass hostUrl option."
      );
    }

    if (!authToken) {
      throw new Error(
        "Auth token not found. Set CONTINUITY_AUTH_TOKEN env var or pass authToken option."
      );
    }

    // Build connection URL with auth params
    const url = `${hostUrl}?token=${authToken}&pluginId=${this.pluginId}`;
    this.client = new RPCClient(url);

    // Initialize API modules
    this.db = new DatabaseAPI(this.client);
    this.events = new EventsAPI(this.client);
    this.chat = new ChatAPI(this.client);
    this.ui = new UIAPI(this.client);
    this.mcp = new MCPAPI(this.client);
    this.settings = new SettingsAPI(this.client);
  }

  /**
   * Connect to the Plugin Host and register this plugin.
   * Call this after setting up tools, events, and panels.
   */
  async start(): Promise<void> {
    await this.client.connect();

    // Register with the host — declare capabilities
    await this.client.request("plugin.register", {
      pluginId: this.pluginId,
      capabilities: this.capabilities,
    });

    console.log(`[${this.pluginId}] Plugin started`);

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log(`[${this.pluginId}] Shutting down...`);
      await this.stop();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }

  /** Disconnect from the Plugin Host */
  async stop(): Promise<void> {
    await this.client.disconnect();
    console.log(`[${this.pluginId}] Plugin stopped`);
  }

  /** Declare capabilities this plugin needs (called before start) */
  declareCapabilities(caps: string[]): void {
    this.capabilities = caps;
  }

  /** Get the plugin ID */
  getId(): string {
    return this.pluginId;
  }
}

// Re-export types for plugin authors
export type {
  ToolDefinition,
  ToolResult,
  PanelOptions,
  PromptOptions,
  NotificationOptions,
  PluginOptions,
} from "./types.js";

export type { MCPServerInfo, MCPHostInfo } from "./mcp.js";
