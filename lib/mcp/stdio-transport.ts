/**
 * Stdio Transport for MCP
 *
 * Spawns MCP server processes via Tauri's shell plugin and communicates
 * over stdin/stdout using newline-delimited JSON-RPC messages.
 */

import { JSONRPCMessage, MCPStdioConfig } from "@/types/mcp";
import { MCPTransport } from "./transport";
import { Command, Child } from "@tauri-apps/plugin-shell";

export class StdioTransport implements MCPTransport {
  private config: MCPStdioConfig;
  private child: Child | null = null;
  private messageHandler: ((message: JSONRPCMessage) => void) | null = null;
  private errorHandler: ((error: Error) => void) | null = null;
  private closeHandler: (() => void) | null = null;
  private stderrHandler: ((line: string) => void) | null = null;
  private buffer = "";

  constructor(config: MCPStdioConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const cmd = Command.create(this.config.command, this.config.args, {
      env: this.config.env,
    });

    // Handle stdout — newline-delimited JSON
    cmd.stdout.on("data", (line: string) => {
      this.buffer += line;
      this.processBuffer();
    });

    // Handle stderr — log as warnings and forward to handler
    cmd.stderr.on("data", (line: string) => {
      console.warn(`[MCP stdio stderr] ${line}`);
      this.stderrHandler?.(line);
    });

    cmd.on("error", (error: string) => {
      this.errorHandler?.(new Error(`Process error: ${error}`));
    });

    cmd.on("close", () => {
      this.child = null;
      this.closeHandler?.();
    });

    this.child = await cmd.spawn();
  }

  async disconnect(): Promise<void> {
    if (this.child) {
      try {
        await this.child.kill();
      } catch {
        // Process may already be dead
      }
      this.child = null;
    }
    this.buffer = "";
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.child) {
      throw new Error("Transport not connected");
    }
    const line = JSON.stringify(message) + "\n";
    await this.child.write(line);
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

  /** StdioTransport-specific: receive stderr output from the child process */
  onStderr(handler: (line: string) => void): void {
    this.stderrHandler = handler;
  }

  /**
   * Process the buffer for complete JSON lines.
   * MCP stdio protocol uses newline-delimited JSON.
   */
  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const message = JSON.parse(trimmed) as JSONRPCMessage;
        this.messageHandler?.(message);
      } catch {
        // Not valid JSON — could be server log output mixed in
        console.warn("[MCP stdio] Non-JSON line on stdout:", trimmed.slice(0, 200));
      }
    }
  }
}
