/**
 * MCP API wrapper
 *
 * Query and control MCP servers from a plugin.
 */
export class MCPAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /** List all configured MCP servers */
    async listServers() {
        const result = await this.client.request("mcp.listServers");
        return result.servers;
    }
    /** Get a specific MCP server by ID */
    async getServer(id) {
        const result = await this.client.request("mcp.getServer", { id });
        return result.server;
    }
    /** Get the Continuity memory server info (port, transport) */
    async getHostInfo() {
        return await this.client.request("mcp.getHostInfo");
    }
    /** Start an MCP server (forwarded to frontend) */
    async startServer(id) {
        await this.client.request("mcp.startServer", { id });
    }
    /** Stop an MCP server (forwarded to frontend) */
    async stopServer(id) {
        await this.client.request("mcp.stopServer", { id });
    }
}
//# sourceMappingURL=mcp.js.map