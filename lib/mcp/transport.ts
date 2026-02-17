/**
 * MCP Transport Interface
 *
 * Abstraction layer for MCP communication transports.
 * Both stdio and HTTP transports implement this interface.
 */

import { JSONRPCMessage } from "@/types/mcp";

export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  onMessage(handler: (message: JSONRPCMessage) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}
