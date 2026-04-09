/**
 * WebSocket JSON-RPC Client
 *
 * Handles the connection to the Plugin Host and provides
 * request/response matching with timeouts.
 */

import WebSocket from "ws";
import type { RPCRequest, RPCResponse, RPCNotification, RPCMessage } from "./types.js";

const REQUEST_TIMEOUT = 30000;

export class RPCClient {
  private ws: WebSocket | null = null;
  private url: string;
  private nextId = 1;
  private pending = new Map<number | string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private notificationHandlers = new Map<string, (params: Record<string, unknown>) => void>();
  private requestHandlers = new Map<string, (params: Record<string, unknown>) => Promise<unknown>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        console.log("[SDK] Connected to Plugin Host");
        resolve();
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on("close", () => {
        console.log("[SDK] Disconnected from Plugin Host");
        this.cleanup();
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on("error", (err) => {
        console.error("[SDK] WebSocket error:", err.message);
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(err);
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Send an RPC request and wait for a response */
  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to Plugin Host");
    }

    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, REQUEST_TIMEOUT);

      this.pending.set(id, { resolve, reject, timeout });

      const request: RPCRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.ws!.send(JSON.stringify(request));
    });
  }

  /** Register a handler for incoming notifications from the host */
  onNotification(method: string, handler: (params: Record<string, unknown>) => void): void {
    this.notificationHandlers.set(method, handler);
  }

  /** Register a handler for incoming requests from the host (e.g., tool:execute) */
  onRequest(method: string, handler: (params: Record<string, unknown>) => Promise<unknown>): void {
    this.requestHandlers.set(method, handler);
  }

  private handleMessage(raw: string): void {
    let message: RPCMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      console.warn("[SDK] Received non-JSON message");
      return;
    }

    // Response to our request
    if ("id" in message && ("result" in message || "error" in message)) {
      const response = message as RPCResponse;
      const pending = this.pending.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    // Request from host (e.g., tool:execute)
    if ("id" in message && "method" in message) {
      const request = message as RPCRequest;
      const handler = this.requestHandlers.get(request.method);
      if (handler) {
        handler(request.params || {})
          .then((result) => {
            this.sendResponse(request.id, result);
          })
          .catch((err) => {
            this.sendError(request.id, -32000, err instanceof Error ? err.message : String(err));
          });
      } else {
        this.sendError(request.id, -32601, `Method not found: ${request.method}`);
      }
      return;
    }

    // Notification from host (e.g., event:memory:created)
    if ("method" in message && !("id" in message)) {
      const notification = message as RPCNotification;
      const handler = this.notificationHandlers.get(notification.method);
      if (handler) {
        handler(notification.params || {});
      }
    }
  }

  private sendResponse(id: number | string, result: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const response: RPCResponse = { jsonrpc: "2.0", id, result };
    this.ws.send(JSON.stringify(response));
  }

  private sendError(id: number | string, code: number, message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const response: RPCResponse = { jsonrpc: "2.0", id, error: { code, message } };
    this.ws.send(JSON.stringify(response));
  }

  private cleanup(): void {
    for (const [, { reject, timeout }] of this.pending) {
      clearTimeout(timeout);
      reject(new Error("Connection lost"));
    }
    this.pending.clear();
  }

  private scheduleReconnect(): void {
    console.log("[SDK] Reconnecting in 3s...");
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => {
        console.error("[SDK] Reconnect failed:", err.message);
        this.scheduleReconnect();
      });
    }, 3000);
  }
}
