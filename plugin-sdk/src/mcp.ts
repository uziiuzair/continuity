/**
 * MCP API wrapper
 *
 * Query and control MCP servers from a plugin.
 */

import type { RPCClient } from "./client.js";

export interface MCPServerInfo {
  id: string;
  name: string;
  transport: { type: string; [key: string]: unknown };
  enabled: boolean;
}

export interface MCPHostInfo {
  name: string;
  transport: string;
  command: string;
  args: string[];
}

export class MCPAPI {
  constructor(private client: RPCClient) {}

  /** List all configured MCP servers */
  async listServers(): Promise<MCPServerInfo[]> {
    const result = await this.client.request("mcp.listServers") as { servers: MCPServerInfo[] };
    return result.servers;
  }

  /** Get a specific MCP server by ID */
  async getServer(id: string): Promise<MCPServerInfo> {
    const result = await this.client.request("mcp.getServer", { id }) as { server: MCPServerInfo };
    return result.server;
  }

  /** Get the Continuity memory server info (port, transport) */
  async getHostInfo(): Promise<MCPHostInfo> {
    return await this.client.request("mcp.getHostInfo") as MCPHostInfo;
  }

  /** Start an MCP server (forwarded to frontend) */
  async startServer(id: string): Promise<void> {
    await this.client.request("mcp.startServer", { id });
  }

  /** Stop an MCP server (forwarded to frontend) */
  async stopServer(id: string): Promise<void> {
    await this.client.request("mcp.stopServer", { id });
  }
}
