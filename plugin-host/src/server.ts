/**
 * Plugin Host WebSocket Server
 *
 * Runs on localhost, accepts connections from plugin sidecars,
 * and routes JSON-RPC messages to the appropriate handlers.
 */

import { WebSocketServer, WebSocket } from "ws";
import type {
  RPCRequest,
  RPCResponse,
  RPCNotification,
  RPCMessage,
  RPCHandler,
  PluginSession,
} from "./types.js";

export class PluginHostServer {
  private wss: WebSocketServer | null = null;
  private sessions: Map<WebSocket, PluginSession> = new Map();
  private handlers: Map<string, RPCHandler> = new Map();
  private authToken: string;
  private port: number;

  // Callbacks for the frontend (via stdout messages)
  private onPluginConnected?: (pluginId: string) => void;
  private onPluginDisconnected?: (pluginId: string) => void;

  constructor(port: number, authToken: string) {
    this.port = port;
    this.authToken = authToken;
  }

  /** Register an RPC method handler */
  handle(method: string, handler: RPCHandler): void {
    this.handlers.set(method, handler);
  }

  /** Start the WebSocket server */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port: this.port, host: "127.0.0.1" });

      this.wss.on("listening", () => {
        console.log(`[PluginHost] WebSocket server listening on ws://127.0.0.1:${this.port}`);
        resolve();
      });

      this.wss.on("error", (err) => {
        console.error("[PluginHost] Server error:", err.message);
        reject(err);
      });

      this.wss.on("connection", (ws, req) => {
        this.handleConnection(ws, req);
      });
    });
  }

  /** Stop the server and disconnect all plugins */
  async stop(): Promise<void> {
    // Notify all plugins of shutdown
    for (const [ws, session] of this.sessions) {
      this.sendNotification(ws, "app:shutdown", {});
      session.pendingToolCalls.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error("Plugin host shutting down"));
      });
      ws.close();
    }
    this.sessions.clear();

    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /** Get a plugin session by plugin ID */
  getSession(pluginId: string): PluginSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.pluginId === pluginId) return session;
    }
    return undefined;
  }

  /** Get all active sessions */
  getAllSessions(): PluginSession[] {
    return Array.from(this.sessions.values());
  }

  /** Broadcast an event to all plugins subscribed to it */
  broadcastEvent(eventName: string, data: Record<string, unknown>): void {
    for (const [ws, session] of this.sessions) {
      if (session.subscribedEvents.has(eventName)) {
        this.sendNotification(ws, `event:${eventName}`, data);
      }
    }
  }

  /** Send a tool call to a specific plugin and wait for the result */
  async callPluginTool(
    pluginId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const session = this.getSession(pluginId);
    if (!session) throw new Error(`Plugin ${pluginId} not connected`);

    if (!session.registeredTools.has(toolName)) {
      throw new Error(`Plugin ${pluginId} has no tool "${toolName}"`);
    }

    const callId = `tool_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        session.pendingToolCalls.delete(callId);
        reject(new Error(`Tool call "${toolName}" timed out after 30s`));
      }, 30000);

      session.pendingToolCalls.set(callId, { resolve, reject, timeout });

      // Send the tool call as an RPC request to the plugin
      const request: RPCRequest = {
        jsonrpc: "2.0",
        id: callId,
        method: "tool:execute",
        params: { name: toolName, arguments: args },
      };

      session.ws.send(JSON.stringify(request));
    });
  }

  /** Set lifecycle callbacks */
  onConnect(cb: (pluginId: string) => void): void {
    this.onPluginConnected = cb;
  }

  onDisconnect(cb: (pluginId: string) => void): void {
    this.onPluginDisconnected = cb;
  }

  // ──────────────────────────────────────────

  private handleConnection(ws: WebSocket, req: import("http").IncomingMessage): void {
    // Auth check via query param: ws://localhost:PORT?token=xxx&pluginId=yyy
    const url = new URL(req.url || "", `http://127.0.0.1:${this.port}`);
    const token = url.searchParams.get("token");
    const pluginId = url.searchParams.get("pluginId");

    if (token !== this.authToken) {
      console.warn(`[PluginHost] Rejected connection: invalid auth token`);
      ws.close(4001, "Invalid auth token");
      return;
    }

    if (!pluginId) {
      ws.close(4002, "Missing pluginId");
      return;
    }

    const session: PluginSession = {
      pluginId,
      ws,
      capabilities: [],
      subscribedEvents: new Set(),
      subscribedTables: new Map(),
      registeredTools: new Map(),
      registeredPanels: new Map(),
      injectedPrompts: new Map(),
      pendingToolCalls: new Map(),
    };

    this.sessions.set(ws, session);
    console.log(`[PluginHost] Plugin connected: ${pluginId}`);
    this.onPluginConnected?.(pluginId);

    ws.on("message", (data) => {
      this.handleMessage(ws, session, data.toString());
    });

    ws.on("close", () => {
      console.log(`[PluginHost] Plugin disconnected: ${pluginId}`);
      session.pendingToolCalls.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error("Plugin disconnected"));
      });
      this.sessions.delete(ws);
      this.onPluginDisconnected?.(pluginId);
    });

    ws.on("error", (err) => {
      console.error(`[PluginHost] WebSocket error for ${pluginId}:`, err.message);
    });
  }

  private async handleMessage(ws: WebSocket, session: PluginSession, raw: string): Promise<void> {
    let message: RPCMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      this.sendError(ws, null, -32700, "Parse error");
      return;
    }

    // Check if it's a response to a tool call we sent TO the plugin
    if ("result" in message || ("error" in message && "id" in message)) {
      const response = message as RPCResponse;
      const pending = session.pendingToolCalls.get(String(response.id));
      if (pending) {
        clearTimeout(pending.timeout);
        session.pendingToolCalls.delete(String(response.id));
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    // It's a request from the plugin
    if (!("method" in message) || !("id" in message)) {
      this.sendError(ws, null, -32600, "Invalid request");
      return;
    }

    const request = message as RPCRequest;
    const handler = this.handlers.get(request.method);

    if (!handler) {
      this.sendError(ws, request.id, -32601, `Method not found: ${request.method}`);
      return;
    }

    try {
      const result = await handler(request.params || {}, session);
      this.sendResult(ws, request.id, result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendError(ws, request.id, -32000, msg);
    }
  }

  private sendResult(ws: WebSocket, id: number | string, result: unknown): void {
    const response: RPCResponse = { jsonrpc: "2.0", id, result };
    ws.send(JSON.stringify(response));
  }

  private sendError(ws: WebSocket, id: number | string | null, code: number, message: string): void {
    const response: RPCResponse = {
      jsonrpc: "2.0",
      id: id ?? 0,
      error: { code, message },
    };
    ws.send(JSON.stringify(response));
  }

  private sendNotification(ws: WebSocket, method: string, params: Record<string, unknown>): void {
    const notification: RPCNotification = { jsonrpc: "2.0", method, params };
    ws.send(JSON.stringify(notification));
  }
}
