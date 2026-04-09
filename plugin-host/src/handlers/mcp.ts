/**
 * MCP RPC Handlers
 *
 * Handles mcp.listServers, mcp.getServer, mcp.getHostInfo
 * Provides plugins with information about the MCP server ecosystem.
 *
 * Note: mcp.startServer and mcp.stopServer require coordination with the
 * frontend MCPManager, so they forward requests via stdout protocol messages.
 */

import { getAppDb } from "../db.js";
import type { RPCHandler } from "../types.js";

function getMcpServers(): unknown[] {
  const db = getAppDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("mcp_servers") as
    | { value: string }
    | undefined;

  if (!row) return [];
  try {
    return JSON.parse(row.value);
  } catch {
    return [];
  }
}

export const mcpListServers: RPCHandler = async (_params, session) => {
  if (!session.capabilities.includes("mcp:read")) {
    throw new Error("Plugin lacks mcp:read capability");
  }

  const servers = getMcpServers();
  return { servers };
};

export const mcpGetServer: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("mcp:read")) {
    throw new Error("Plugin lacks mcp:read capability");
  }

  const id = params.id as string;
  if (typeof id !== "string") throw new Error("id must be a string");

  const servers = getMcpServers() as { id: string }[];
  const server = servers.find((s) => s.id === id);
  if (!server) throw new Error(`MCP server not found: ${id}`);

  return { server };
};

export const mcpGetHostInfo: RPCHandler = async (_params, session) => {
  if (!session.capabilities.includes("mcp:read")) {
    throw new Error("Plugin lacks mcp:read capability");
  }

  // Return info about the continuity MCP memory server
  return {
    name: "continuity-memory",
    transport: "stdio",
    command: "npx",
    args: ["continuity-memory"],
  };
};

export const mcpStartServer: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("mcp:control")) {
    throw new Error("Plugin lacks mcp:control capability");
  }

  const id = params.id as string;
  if (typeof id !== "string") throw new Error("id must be a string");

  // Forward to frontend via stdout protocol message
  const msg = {
    type: "mcp_control",
    pluginId: session.pluginId,
    data: { action: "start", serverId: id },
  };
  console.log(`__PLUGIN_HOST_MSG__${JSON.stringify(msg)}`);

  return { forwarded: true, action: "start", serverId: id };
};

export const mcpStopServer: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("mcp:control")) {
    throw new Error("Plugin lacks mcp:control capability");
  }

  const id = params.id as string;
  if (typeof id !== "string") throw new Error("id must be a string");

  const msg = {
    type: "mcp_control",
    pluginId: session.pluginId,
    data: { action: "stop", serverId: id },
  };
  console.log(`__PLUGIN_HOST_MSG__${JSON.stringify(msg)}`);

  return { forwarded: true, action: "stop", serverId: id };
};

export function registerMCPHandlers(handle: (method: string, handler: RPCHandler) => void): void {
  handle("mcp.listServers", mcpListServers);
  handle("mcp.getServer", mcpGetServer);
  handle("mcp.getHostInfo", mcpGetHostInfo);
  handle("mcp.startServer", mcpStartServer);
  handle("mcp.stopServer", mcpStopServer);
}
