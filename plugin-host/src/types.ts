/**
 * Plugin Host internal types
 */

import type { WebSocket } from "ws";

/** JSON-RPC 2.0 message types */
export interface RPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface RPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface RPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export type RPCMessage = RPCRequest | RPCResponse | RPCNotification;

/** A connected plugin's session state */
export interface PluginSession {
  pluginId: string;
  ws: WebSocket;
  capabilities: string[];
  subscribedEvents: Set<string>;
  subscribedTables: Map<string, Set<string>>; // table -> event types
  registeredTools: Map<string, ToolRegistration>;
  registeredPanels: Map<string, PanelRegistration>;
  injectedPrompts: Map<string, PromptRegistration>;
  pendingToolCalls: Map<string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>;
}

export interface ToolRegistration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface PanelRegistration {
  slot: "sidebar" | "settings" | "statusbar";
  label: string;
  icon: string;
  url: string;
}

export interface PromptRegistration {
  id: string;
  content: string;
  position: "system" | "context";
}

/** RPC handler function type */
export type RPCHandler = (
  params: Record<string, unknown>,
  session: PluginSession
) => Promise<unknown>;
