/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Types for connecting to external MCP servers, managing their lifecycle,
 * and integrating their tools/resources/prompts into the AI chat system.
 */

// ============================================
// SERVER CONFIGURATION
// ============================================

export type MCPTransportType = "stdio" | "http";

export interface MCPStdioConfig {
  type: "stdio";
  command: string; // e.g. "npx", "node", "python3", "uvx", "deno"
  args: string[]; // e.g. ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me"]
  env?: Record<string, string>;
}

export interface MCPHttpConfig {
  type: "http";
  url: string; // e.g. "http://localhost:3001/mcp"
  headers?: Record<string, string>;
}

export type MCPTransportConfig = MCPStdioConfig | MCPHttpConfig;

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: MCPTransportConfig;
  enabled: boolean;
}

// ============================================
// CONNECTION STATE
// ============================================

export type MCPConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

export type MCPLogLevel = "info" | "warn" | "error";

export interface MCPLogEntry {
  timestamp: number;
  level: MCPLogLevel;
  message: string;
}

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  error?: string;
  tools: MCPToolInfo[];
  resources: MCPResourceInfo[];
  prompts: MCPPromptInfo[];
  logs: MCPLogEntry[];
}

// ============================================
// TOOL / RESOURCE / PROMPT METADATA
// ============================================

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  /** Globally unique name: serverId__toolName */
  qualifiedName: string;
  serverId: string;
  /** MCP Apps metadata — present when the tool provides an interactive UI */
  _meta?: {
    ui?: {
      resourceUri?: string;
      permissions?: string[];
      csp?: Record<string, string[]>;
    };
    [key: string]: unknown;
  };
}

export interface MCPResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface MCPPromptInfo {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
  serverId: string;
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

// ============================================
// JSON-RPC PROTOCOL TYPES
// ============================================

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse | JSONRPCNotification;

// ============================================
// CLAUDE DESKTOP CONFIG FORMAT (for import)
// ============================================

export interface ClaudeDesktopConfig {
  mcpServers: Record<
    string,
    {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }
  >;
}
