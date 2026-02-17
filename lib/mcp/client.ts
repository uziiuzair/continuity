/**
 * MCP Protocol Client
 *
 * Transport-agnostic JSON-RPC layer that handles the MCP protocol.
 * Manages connection lifecycle, request/response matching, and
 * capability discovery for tools, resources, and prompts.
 */

import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  MCPToolInfo,
  MCPResourceInfo,
  MCPPromptInfo,
} from "@/types/mcp";
import { MCPTransport } from "./transport";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 30_000;

export class MCPClient {
  private transport: MCPTransport;
  private nextId = 1;
  private pendingRequests: Map<number | string, PendingRequest> = new Map();
  private serverCapabilities: Record<string, unknown> = {};
  private tools: MCPToolInfo[] = [];
  private resources: MCPResourceInfo[] = [];
  private prompts: MCPPromptInfo[] = [];
  private serverId: string;
  private onToolsChanged: (() => void) | null = null;

  constructor(transport: MCPTransport, serverId: string) {
    this.transport = transport;
    this.serverId = serverId;
    this.transport.onMessage((message) => this.handleMessage(message));
  }

  // ==================================================
  // PUBLIC LIFECYCLE
  // ==================================================

  async connect(): Promise<void> {
    await this.transport.connect();

    const initResult = (await this.sendRequest("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "ooozzy", version: "1.0.0" },
    })) as Record<string, unknown> | undefined;

    if (initResult && typeof initResult === "object") {
      this.serverCapabilities =
        (initResult.capabilities as Record<string, unknown>) ?? {};
    }

    this.sendNotification("notifications/initialized");

    await this.discoverCapabilities();
  }

  async disconnect(): Promise<void> {
    this.pendingRequests.forEach((pending, id) => {
      clearTimeout(pending.timer);
      pending.reject(new Error("disconnected"));
      this.pendingRequests.delete(id);
    });

    await this.transport.disconnect();
  }

  // ==================================================
  // PUBLIC TOOL / RESOURCE / PROMPT OPERATIONS
  // ==================================================

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    return this.sendRequest("tools/call", { name, arguments: args });
  }

  async readResource(uri: string): Promise<unknown> {
    return this.sendRequest("resources/read", { uri });
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>
  ): Promise<unknown> {
    return this.sendRequest("prompts/get", { name, arguments: args });
  }

  // ==================================================
  // PUBLIC ACCESSORS
  // ==================================================

  getTools(): MCPToolInfo[] {
    return this.tools;
  }

  getResources(): MCPResourceInfo[] {
    return this.resources;
  }

  getPrompts(): MCPPromptInfo[] {
    return this.prompts;
  }

  setOnToolsChanged(cb: (() => void) | null): void {
    this.onToolsChanged = cb;
  }

  // ==================================================
  // PRIVATE — REQUEST / NOTIFICATION TRANSPORT
  // ==================================================

  private async sendRequest(
    method: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    const id = this.nextId++;

    const message: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      ...(params !== undefined && { params }),
    };

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timed out: ${method} (id=${id})`));
      }, REQUEST_TIMEOUT_MS);

      this.pendingRequests.set(id, { resolve, reject, timer });
      this.transport.send(message).catch((err: unknown) => {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(
          err instanceof Error ? err : new Error("Failed to send message")
        );
      });
    });
  }

  private sendNotification(
    method: string,
    params?: Record<string, unknown>
  ): void {
    const message: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      ...(params !== undefined && { params }),
    };

    this.transport.send(message).catch((err: unknown) => {
      console.error(
        `[MCPClient] Failed to send notification "${method}":`,
        err instanceof Error ? err.message : err
      );
    });
  }

  // ==================================================
  // PRIVATE — MESSAGE HANDLING
  // ==================================================

  private handleMessage(message: JSONRPCMessage): void {
    if (isResponse(message)) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) {
        console.warn(
          `[MCPClient] Received response for unknown request id=${message.id}`
        );
        return;
      }

      clearTimeout(pending.timer);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(
          new Error(`RPC error ${message.error.code}: ${message.error.message}`)
        );
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (isNotification(message)) {
      this.handleNotification(message);
      return;
    }

    console.warn("[MCPClient] Received unknown message:", message);
  }

  private handleNotification(notification: JSONRPCNotification): void {
    switch (notification.method) {
      case "notifications/tools/list_changed":
        this.discoverCapabilities().then(() => {
          this.onToolsChanged?.();
        });
        break;

      case "notifications/resources/list_changed":
        this.discoverCapabilities();
        break;

      default:
        console.debug(
          `[MCPClient] Unhandled notification: ${notification.method}`
        );
    }
  }

  // ==================================================
  // PRIVATE — CAPABILITY DISCOVERY
  // ==================================================

  private async discoverCapabilities(): Promise<void> {
    await Promise.all([
      this.discoverTools(),
      this.discoverResources(),
      this.discoverPrompts(),
    ]);
  }

  private async discoverTools(): Promise<void> {
    try {
      const result = (await this.sendRequest("tools/list")) as {
        tools?: Array<{
          name: string;
          description?: string;
          inputSchema?: Record<string, unknown>;
          _meta?: Record<string, unknown>;
        }>;
      };

      this.tools = (result?.tools ?? []).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        qualifiedName: `${this.serverId}__${tool.name}`,
        serverId: this.serverId,
        _meta: tool._meta as MCPToolInfo["_meta"],
      }));
    } catch {
      // Server may not support tools — silently skip
    }
  }

  private async discoverResources(): Promise<void> {
    try {
      const result = (await this.sendRequest("resources/list")) as {
        resources?: Array<{
          uri: string;
          name: string;
          description?: string;
          mimeType?: string;
        }>;
      };

      this.resources = (result?.resources ?? []).map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        serverId: this.serverId,
      }));
    } catch {
      // Server may not support resources — silently skip
    }
  }

  private async discoverPrompts(): Promise<void> {
    try {
      const result = (await this.sendRequest("prompts/list")) as {
        prompts?: Array<{
          name: string;
          description?: string;
          arguments?: Array<{
            name: string;
            description?: string;
            required?: boolean;
          }>;
        }>;
      };

      this.prompts = (result?.prompts ?? []).map((prompt) => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        serverId: this.serverId,
      }));
    } catch {
      // Server may not support prompts — silently skip
    }
  }
}

// ==================================================
// MESSAGE TYPE GUARDS (duck typing)
// ==================================================

function isResponse(message: JSONRPCMessage): message is JSONRPCResponse {
  return (
    "id" in message &&
    message.id !== undefined &&
    ("result" in message || "error" in message)
  );
}

function isNotification(
  message: JSONRPCMessage
): message is JSONRPCNotification {
  return "method" in message && !("id" in message && message.id !== undefined);
}
