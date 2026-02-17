/**
 * MCP Connection Manager
 *
 * Singleton that manages all MCP server connections, persists configuration
 * to SQLite via the settings table, and provides state subscriptions for React.
 */

import {
  MCPServerConfig,
  MCPServerState,
  MCPConnectionStatus,
  MCPToolInfo,
  MCPLogLevel,
} from "@/types/mcp";
import { MCPClient } from "./client";
import { StdioTransport } from "./stdio-transport";
import { StreamableHTTPTransport } from "./http-transport";
import { getSetting, setSetting } from "@/lib/db/settings";
import { isTauriContext } from "@/lib/db";

export class MCPManager {
  private static instance: MCPManager | null = null;
  private clients: Map<string, MCPClient> = new Map();
  private states: Map<string, MCPServerState> = new Map();
  private configs: MCPServerConfig[] = [];
  private listeners: Set<() => void> = new Set();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  // ==================================================
  // INITIALIZATION
  // ==================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!isTauriContext()) return;

    const raw = await getSetting("mcp_servers");
    if (raw) {
      try {
        this.configs = JSON.parse(raw) as MCPServerConfig[];
      } catch {
        console.error("[MCPManager] Failed to parse saved MCP configs");
        this.configs = [];
      }
    }

    // Create state entries for ALL configs (so disabled ones are visible too)
    for (const config of this.configs) {
      this.updateState(config.id, {
        config,
        status: "disconnected",
        tools: [],
        resources: [],
        prompts: [],
        logs: [],
      });
    }

    // Connect enabled servers in parallel (fire and forget)
    for (const config of this.configs) {
      if (config.enabled) {
        this.connectServer(config.id).catch((err: unknown) => {
          console.error(
            `[MCPManager] Failed to connect server "${config.id}":`,
            err instanceof Error ? err.message : err
          );
        });
      }
    }

    this.notifyListeners();

    this.initialized = true;
  }

  // ==================================================
  // SERVER CRUD
  // ==================================================

  async addServer(config: MCPServerConfig): Promise<void> {
    this.configs.push(config);
    await this.persistConfigs();

    this.updateState(config.id, {
      config,
      status: "disconnected",
      tools: [],
      resources: [],
      prompts: [],
      logs: [],
    });

    if (config.enabled) {
      this.connectServer(config.id).catch((err: unknown) => {
        console.error(
          `[MCPManager] Failed to connect server "${config.id}":`,
          err instanceof Error ? err.message : err
        );
      });
    }

    this.notifyListeners();
  }

  async removeServer(id: string): Promise<void> {
    // Disconnect if connected (fire and forget)
    this.disconnectServer(id).catch(() => {});

    this.configs = this.configs.filter((c) => c.id !== id);
    this.states.delete(id);
    this.clients.delete(id);

    const timer = this.reconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(id);
    }
    this.reconnectAttempts.delete(id);

    await this.persistConfigs();
    this.notifyListeners();
  }

  async updateServer(
    id: string,
    updates: Partial<MCPServerConfig>
  ): Promise<void> {
    const index = this.configs.findIndex((c) => c.id === id);
    if (index === -1) return;

    const previous = this.configs[index];
    const updated = { ...previous, ...updates };
    this.configs[index] = updated;

    await this.persistConfigs();

    // Handle enabled toggling
    if (updates.enabled === false && previous.enabled) {
      this.disconnectServer(id).catch(() => {});
    } else if (updates.enabled === true && !previous.enabled) {
      this.connectServer(id).catch((err: unknown) => {
        console.error(
          `[MCPManager] Failed to connect server "${id}":`,
          err instanceof Error ? err.message : err
        );
      });
    } else if (
      updates.transport !== undefined &&
      this.clients.has(id)
    ) {
      // Transport config changed while connected — reconnect
      await this.disconnectServer(id).catch(() => {});
      this.connectServer(id).catch((err: unknown) => {
        console.error(
          `[MCPManager] Failed to reconnect server "${id}":`,
          err instanceof Error ? err.message : err
        );
      });
    }

    this.notifyListeners();
  }

  // ==================================================
  // CONNECTION LIFECYCLE
  // ==================================================

  async connectServer(id: string): Promise<void> {
    const config = this.configs.find((c) => c.id === id);
    if (!config) return;

    this.updateState(id, { config, status: "connecting" });
    this.notifyListeners();

    // Create transport based on config type
    const transport =
      config.transport.type === "stdio"
        ? new StdioTransport(config.transport)
        : new StreamableHTTPTransport(config.transport);

    // Log transport creation
    if (config.transport.type === "stdio") {
      const cmdStr = `${config.transport.command} ${config.transport.args.join(" ")}`;
      this.addLog(id, "info", `Creating stdio transport: ${cmdStr}`);
    } else {
      this.addLog(id, "info", `Creating HTTP transport: ${config.transport.url}`);
    }

    const client = new MCPClient(transport, config.id);

    // Tools-changed callback — update state when server's tool list changes
    client.setOnToolsChanged(() => {
      this.updateState(id, {
        tools: client.getTools(),
        resources: client.getResources(),
        prompts: client.getPrompts(),
      });
      this.notifyListeners();
    });

    // Wire stderr handler for stdio transports
    if (transport instanceof StdioTransport) {
      transport.onStderr((line: string) => {
        const trimmed = line.trim();
        if (trimmed) {
          this.addLog(id, "warn", `[stderr] ${trimmed}`);
        }
      });
    }

    // Transport error handler — only reconnect if an established connection broke.
    // During connecting/reconnecting, connectServer's catch block handles retries.
    transport.onError((error: Error) => {
      const wasConnected = this.states.get(id)?.status === "connected";
      this.addLog(id, "error", `Transport error: ${error.message}`);
      this.updateState(id, {
        status: "error",
        error: error.message,
      });
      this.notifyListeners();
      if (wasConnected) {
        this.attemptReconnect(id);
      }
    });

    // Transport close handler — reconnect if it was previously connected
    transport.onClose(() => {
      const currentState = this.states.get(id);
      if (currentState?.status === "connected") {
        this.addLog(id, "warn", "Transport closed unexpectedly");
        this.updateState(id, { status: "disconnected" });
        this.notifyListeners();
        this.attemptReconnect(id);
      }
    });

    try {
      this.addLog(id, "info", "Connecting transport...");
      await client.connect();
      this.clients.set(id, client);

      const tools = client.getTools();
      const resources = client.getResources();
      const prompts = client.getPrompts();

      this.reconnectAttempts.delete(id);

      this.addLog(
        id,
        "info",
        `Connected successfully. Discovered ${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts.`
      );

      this.updateState(id, {
        status: "connected",
        error: undefined,
        tools,
        resources,
        prompts,
      });
      this.notifyListeners();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.addLog(id, "error", `Connection failed: ${message}`);
      this.updateState(id, {
        status: "error",
        error: message,
      });
      this.notifyListeners();
      this.attemptReconnect(id);
    }
  }

  async disconnectServer(id: string): Promise<void> {
    // Clear any pending reconnect
    const timer = this.reconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(id);
    }

    this.reconnectAttempts.delete(id);

    const client = this.clients.get(id);
    if (client) {
      this.addLog(id, "info", "Disconnecting...");
      await client.disconnect();
      this.clients.delete(id);
    }

    this.updateState(id, {
      status: "disconnected",
      error: undefined,
      tools: [],
      resources: [],
      prompts: [],
    });
    this.notifyListeners();
  }

  private attemptReconnect(id: string): void {
    const MAX_ATTEMPTS = 5;
    const attempt = this.reconnectAttempts.get(id) ?? 0;

    if (attempt >= MAX_ATTEMPTS) {
      this.addLog(id, "error", `Reconnection failed after ${MAX_ATTEMPTS} attempts. Giving up.`);
      this.reconnectAttempts.delete(id);
      return;
    }

    // Clear any existing timer for this id
    const existing = this.reconnectTimers.get(id);
    if (existing) {
      clearTimeout(existing);
    }

    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    const delaySec = (delay / 1000).toFixed(1);

    this.addLog(id, "info", `Reconnecting (attempt ${attempt + 1}/${MAX_ATTEMPTS}) in ${delaySec}s...`);
    this.reconnectAttempts.set(id, attempt + 1);

    this.updateState(id, { status: "reconnecting" });
    this.notifyListeners();

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(id);
      this.connectServer(id).catch(() => {});
    }, delay);

    this.reconnectTimers.set(id, timer);
  }

  // ==================================================
  // TOOL ACCESS
  // ==================================================

  getAllMCPTools(): MCPToolInfo[] {
    const tools: MCPToolInfo[] = [];
    this.states.forEach((state) => {
      if (state.status === "connected") {
        tools.push(...state.tools);
      }
    });
    return tools;
  }

  async readResource(serverId: string, uri: string): Promise<unknown> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(
        `Server "${serverId}" not connected. Cannot read resource.`
      );
    }
    return client.readResource(uri);
  }

  async callTool(
    qualifiedName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const separatorIndex = qualifiedName.indexOf("__");
    if (separatorIndex === -1) {
      throw new Error(
        `Invalid qualified tool name: "${qualifiedName}". Expected format: serverId__toolName`
      );
    }

    const serverId = qualifiedName.slice(0, separatorIndex);
    const toolName = qualifiedName.slice(separatorIndex + 2);

    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(
        `Server "${serverId}" not connected. Cannot call tool "${toolName}".`
      );
    }

    return client.callTool(toolName, args);
  }

  // ==================================================
  // STATE & SUBSCRIPTIONS
  // ==================================================

  getStates(): MCPServerState[] {
    return Array.from(this.states.values());
  }

  /** Alias for getStates() — used by mcp-tools.ts */
  getServerStates(): MCPServerState[] {
    return this.getStates();
  }

  getConfigs(): MCPServerConfig[] {
    return [...this.configs];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ==================================================
  // SHUTDOWN
  // ==================================================

  async shutdown(): Promise<void> {
    // Clear all reconnect timers and attempt counters
    this.reconnectTimers.forEach((timer) => clearTimeout(timer));
    this.reconnectTimers.clear();
    this.reconnectAttempts.clear();

    // Disconnect all clients
    const disconnects: Promise<void>[] = [];
    this.clients.forEach((client, id) => {
      disconnects.push(
        client.disconnect().catch((err: unknown) => {
          console.error(
            `[MCPManager] Error disconnecting "${id}":`,
            err instanceof Error ? err.message : err
          );
        })
      );
    });
    await Promise.all(disconnects);

    this.clients.clear();
    this.states.clear();
    this.configs = [];
    this.listeners.clear();
    this.initialized = false;
  }

  // ==================================================
  // PRIVATE HELPERS
  // ==================================================

  private async persistConfigs(): Promise<void> {
    if (isTauriContext()) {
      await setSetting("mcp_servers", JSON.stringify(this.configs));
    }
  }

  private addLog(id: string, level: MCPLogLevel, message: string): void {
    const state = this.states.get(id);
    if (!state) return;

    const entry = { timestamp: Date.now(), level, message };
    const logs = [...state.logs, entry];

    // Cap at 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    this.states.set(id, { ...state, logs });
    this.notifyListeners();
  }

  private updateState(id: string, updates: Partial<MCPServerState>): void {
    const existing = this.states.get(id);

    if (existing) {
      this.states.set(id, { ...existing, ...updates });
    } else {
      // Create default state from config
      const config = this.configs.find((c) => c.id === id);
      if (!config) return;

      const defaultState: MCPServerState = {
        config,
        status: "disconnected" as MCPConnectionStatus,
        tools: [],
        resources: [],
        prompts: [],
        logs: [],
      };
      this.states.set(id, { ...defaultState, ...updates });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}
