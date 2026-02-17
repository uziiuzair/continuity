/**
 * Streamable HTTP Transport for MCP
 *
 * Implements the MCP Streamable HTTP transport (2025-03-26 spec):
 * - POST requests for sending JSON-RPC messages
 * - SSE responses for streaming server messages
 * - Session management via Mcp-Session-Id header
 * - DELETE for session cleanup
 *
 * Uses Tauri's HTTP plugin for CORS-free requests.
 */

import { JSONRPCMessage, MCPHttpConfig } from "@/types/mcp";
import { MCPTransport } from "./transport";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export class StreamableHTTPTransport implements MCPTransport {
  private config: MCPHttpConfig;
  private sessionId: string | null = null;
  private messageHandler: ((message: JSONRPCMessage) => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private connected = false;

  constructor(config: MCPHttpConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    this.connected = true;
    // HTTP transport doesn't need a persistent connection — session is established
    // on the first POST request via the Mcp-Session-Id response header.
  }

  async disconnect(): Promise<void> {
    if (this.sessionId) {
      try {
        await tauriFetch(this.config.url, {
          method: "DELETE",
          headers: {
            ...this.config.headers,
            "Mcp-Session-Id": this.sessionId,
          },
        });
      } catch {
        // Best effort cleanup
      }
    }
    this.sessionId = null;
    this.connected = false;
    this.closeHandler?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.connected) {
      throw new Error("Transport not connected");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...this.config.headers,
    };

    if (this.sessionId) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }

    try {
      const response = await tauriFetch(this.config.url, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      });

      // Capture session ID from response
      const newSessionId = response.headers.get("Mcp-Session-Id");
      if (newSessionId) {
        this.sessionId = newSessionId;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream")) {
        // SSE response — parse server-sent events
        await this.parseSSEResponse(response);
      } else if (contentType.includes("application/json")) {
        // Direct JSON response
        const data = await response.json();
        if (data) {
          this.messageHandler?.(data as JSONRPCMessage);
        }
      }
      // 202 Accepted or empty body = notification acknowledged, no response
    } catch (error) {
      this.errorHandler?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  /**
   * Parse SSE response body for JSON-RPC messages.
   * SSE format: "event: message\ndata: {...}\n\n"
   */
  private async parseSSEResponse(response: Response): Promise<void> {
    const text = await response.text();
    const lines = text.split("\n");

    let dataBuffer = "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        dataBuffer += line.slice(6);
      } else if (line === "" && dataBuffer) {
        // End of event
        try {
          const message = JSON.parse(dataBuffer) as JSONRPCMessage;
          this.messageHandler?.(message);
        } catch {
          console.warn("[MCP HTTP] Failed to parse SSE data:", dataBuffer.slice(0, 200));
        }
        dataBuffer = "";
      }
    }
  }
}
