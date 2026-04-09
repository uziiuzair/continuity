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
export class ContinuityPlugin {
    client;
    pluginId;
    capabilities = [];
    /** Database access — query, execute, subscribe */
    db;
    /** Real-time event subscriptions */
    events;
    /** Register AI tools and inject prompts */
    chat;
    /** UI panels, notifications, badges */
    ui;
    /** MCP server control */
    mcp;
    /** Plugin configuration */
    settings;
    constructor(options) {
        const hostUrl = options?.hostUrl || process.env.CONTINUITY_HOST_URL;
        const authToken = options?.authToken || process.env.CONTINUITY_AUTH_TOKEN;
        this.pluginId = options?.pluginId || process.env.CONTINUITY_PLUGIN_ID || "unknown";
        if (!hostUrl) {
            throw new Error("Plugin Host URL not found. Set CONTINUITY_HOST_URL env var or pass hostUrl option.");
        }
        if (!authToken) {
            throw new Error("Auth token not found. Set CONTINUITY_AUTH_TOKEN env var or pass authToken option.");
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
    async start() {
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
    async stop() {
        await this.client.disconnect();
        console.log(`[${this.pluginId}] Plugin stopped`);
    }
    /** Declare capabilities this plugin needs (called before start) */
    declareCapabilities(caps) {
        this.capabilities = caps;
    }
    /** Get the plugin ID */
    getId() {
        return this.pluginId;
    }
}
//# sourceMappingURL=index.js.map