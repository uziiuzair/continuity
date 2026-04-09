/**
 * MCP API wrapper
 *
 * Query and control MCP servers from a plugin.
 */
import type { RPCClient } from "./client.js";
export interface MCPServerInfo {
    id: string;
    name: string;
    transport: {
        type: string;
        [key: string]: unknown;
    };
    enabled: boolean;
}
export interface MCPHostInfo {
    name: string;
    transport: string;
    command: string;
    args: string[];
}
export declare class MCPAPI {
    private client;
    constructor(client: RPCClient);
    /** List all configured MCP servers */
    listServers(): Promise<MCPServerInfo[]>;
    /** Get a specific MCP server by ID */
    getServer(id: string): Promise<MCPServerInfo>;
    /** Get the Continuity memory server info (port, transport) */
    getHostInfo(): Promise<MCPHostInfo>;
    /** Start an MCP server (forwarded to frontend) */
    startServer(id: string): Promise<void>;
    /** Stop an MCP server (forwarded to frontend) */
    stopServer(id: string): Promise<void>;
}
//# sourceMappingURL=mcp.d.ts.map