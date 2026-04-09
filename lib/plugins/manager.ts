/**
 * Plugin Manager
 *
 * Frontend singleton that manages the Plugin Host process lifecycle
 * and provides plugin state to the React layer.
 *
 * Responsibilities:
 * - Spawns/manages the Plugin Host sidecar process
 * - Installs/uninstalls plugins (file operations)
 * - Enables/disables plugins (DB + sidecar spawning)
 * - Parses Plugin Host stdout messages for state updates
 * - Provides state subscriptions for React
 */

import { Command, Child } from "@tauri-apps/plugin-shell";
import {
  getAllPlugins,
  insertPlugin,
  updatePluginEnabled,
  updatePluginSettings,
  deletePlugin as dbDeletePlugin,
  getPlugin,
} from "@/lib/db/plugins";
import { validateManifest, getSpawnCommand } from "./manifest";
import type {
  PluginInfo,
  PluginManifest,
  PluginStatus,
  RegisteredPanel,
  RegisteredTool,
  RegisteredPrompt,
} from "@/types/plugin";
import { isTauriContext } from "@/lib/db";

interface PluginHostMessage {
  type: string;
  pluginId?: string;
  data: Record<string, unknown>;
}

export interface PluginManagerState {
  hostStatus: "stopped" | "starting" | "running" | "error";
  hostPort: number | null;
  plugins: PluginInfo[];
  panels: RegisteredPanel[];
  tools: RegisteredTool[];
  prompts: RegisteredPrompt[];
}

export class PluginManager {
  private static instance: PluginManager | null = null;

  private hostProcess: Child | null = null;
  private hostPort: number | null = null;
  private hostToken: string | null = null;
  private hostStatus: "stopped" | "starting" | "running" | "error" = "stopped";

  private plugins: Map<string, PluginInfo> = new Map();
  private pluginProcesses: Map<string, Child> = new Map();
  private panels: RegisteredPanel[] = [];
  private tools: RegisteredTool[] = [];
  private prompts: RegisteredPrompt[] = [];

  private listeners: Set<() => void> = new Set();
  private initialized = false;

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    if (this.initialized || !isTauriContext()) return;
    this.initialized = true;

    // Load plugins from DB
    const dbPlugins = await getAllPlugins();
    for (const p of dbPlugins) {
      this.plugins.set(p.id, p);
    }

    // Start the Plugin Host process
    await this.startHost();

    // Auto-start enabled plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled) {
        this.startPlugin(plugin.id).catch((err) => {
          console.error(`[PluginManager] Failed to auto-start plugin ${plugin.id}:`, err);
        });
      }
    }

    this.notify();
  }

  // ============================================
  // PLUGIN HOST LIFECYCLE
  // ============================================

  private async startHost(): Promise<void> {
    this.hostStatus = "starting";
    this.notify();

    try {
      // Resolve the absolute path to the plugin-host entry point.
      // Tauri's shell plugin doesn't guarantee a working directory,
      // so we must use absolute paths.
      const { resolveResource } = await import("@tauri-apps/api/path");
      const { exists } = await import("@tauri-apps/plugin-fs");

      let hostEntryPath: string;
      let isDevMode = true;

      // Try production bundled path first
      try {
        const prodPath = await resolveResource("plugin-host/plugin-host.mjs");
        if (await exists(prodPath)) {
          hostEntryPath = prodPath;
          isDevMode = false;
        } else {
          throw new Error("Bundled file not found");
        }
      } catch {
        // Dev mode: resolve from src-tauri parent (project root)
        const resourceDir = await resolveResource("");
        // In dev, resourceDir is like .../src-tauri/target/debug/
        // Walk up to find the project root (contains plugin-host/)
        const parts = resourceDir.split("/");
        const srcTauriIdx = parts.indexOf("src-tauri");
        if (srcTauriIdx > 0) {
          const projectRoot = parts.slice(0, srcTauriIdx).join("/");
          hostEntryPath = `${projectRoot}/plugin-host/src/index.ts`;
        } else {
          // Fallback: resolve from resourceDir parent chain
          hostEntryPath = resourceDir.replace(/src-tauri\/.*$/, "plugin-host/src/index.ts");
        }
      }

      console.log(`[PluginManager] Starting host: ${isDevMode ? "dev" : "prod"} mode, path: ${hostEntryPath}`);

      const cmd = isDevMode
        ? Command.create("npx", ["tsx", hostEntryPath])
        : Command.create("node", [hostEntryPath]);

      cmd.stdout.on("data", (line: string) => {
        this.handleHostStdout(line);
      });

      cmd.stderr.on("data", (line: string) => {
        console.log(`[PluginHost] ${line}`);
      });

      cmd.on("error", (error: string) => {
        console.error("[PluginManager] Host process error:", error);
        this.hostStatus = "error";
        this.notify();
      });

      cmd.on("close", () => {
        console.warn("[PluginManager] Host process exited");
        this.hostProcess = null;
        this.hostStatus = "stopped";
        this.notify();
      });

      this.hostProcess = await cmd.spawn();
    } catch (err) {
      console.error("[PluginManager] Failed to start host:", err);
      this.hostStatus = "error";
      this.notify();
    }
  }

  private handleHostStdout(line: string): void {
    if (!line.startsWith("__PLUGIN_HOST_MSG__")) return;

    try {
      const json = line.slice("__PLUGIN_HOST_MSG__".length);
      const msg = JSON.parse(json) as PluginHostMessage;

      switch (msg.type) {
        case "startup":
          this.hostPort = msg.data.port as number;
          this.hostToken = msg.data.token as string;
          this.hostStatus = "running";
          console.log(`[PluginManager] Host ready on port ${this.hostPort}`);
          this.notify();
          break;

        case "plugin_state":
          this.handlePluginStateChange(msg.pluginId!, msg.data);
          break;

        case "notification":
          // Forward to notification system (TODO: integrate with Mantine notifications)
          console.log(`[Plugin ${msg.pluginId}] Notification:`, msg.data);
          break;

        case "badge":
          // Forward to UI (TODO: integrate with sidebar badges)
          console.log(`[Plugin ${msg.pluginId}] Badge update:`, msg.data);
          break;

        case "mcp_control":
          // Forward to MCPManager (TODO: integrate)
          console.log(`[Plugin ${msg.pluginId}] MCP control:`, msg.data);
          break;
      }
    } catch (err) {
      console.warn("[PluginManager] Failed to parse host message:", line);
    }
  }

  private handlePluginStateChange(pluginId: string, data: Record<string, unknown>): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const status = data.status as string;
    if (status === "running" || status === "connected") {
      plugin.status = "running";
    } else if (status === "disconnected") {
      plugin.status = plugin.enabled ? "disabled" : "installed";
    }

    this.plugins.set(pluginId, { ...plugin });
    this.notify();
  }

  async restartHost(): Promise<void> {
    console.log("[PluginManager] Restarting Plugin Host...");
    await this.stopHost();
    await this.startHost();
  }

  async stopHost(): Promise<void> {
    if (this.hostProcess) {
      try {
        await this.hostProcess.kill();
      } catch {
        // Process may already be dead
      }
      this.hostProcess = null;
    }
    this.hostStatus = "stopped";
    this.hostPort = null;
    this.hostToken = null;
    this.notify();
  }

  // ============================================
  // PLUGIN LIFECYCLE
  // ============================================

  async installPlugin(source: string, installPath: string): Promise<PluginInfo> {
    // Step 1: Read manifest file
    let raw: string;
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { join } = await import("@tauri-apps/api/path");
      const manifestPath = await join(installPath, "continuity-plugin.json");
      raw = await readTextFile(manifestPath);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read continuity-plugin.json from "${installPath}": ${detail}`);
    }

    // Step 2: Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("continuity-plugin.json contains invalid JSON");
    }

    // Step 3: Validate manifest
    const result = validateManifest(parsed);
    if (!result.valid || !result.manifest) {
      throw new Error(
        `Invalid plugin manifest:\n${result.errors.map((e) => `  ${e.field}: ${e.message}`).join("\n")}`
      );
    }

    const manifest = result.manifest;

    // Step 4: Check for duplicate
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin "${manifest.id}" is already installed`);
    }

    // Step 5: Save to DB
    try {
      await insertPlugin(manifest, installPath, source);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to save plugin to database: ${detail}`);
    }

    // Step 6: Load into memory
    const plugin = (await getPlugin(manifest.id))!;
    this.plugins.set(plugin.id, plugin);
    this.notify();

    return plugin;
  }

  async uninstallPlugin(id: string): Promise<void> {
    // Stop if running
    await this.stopPlugin(id);

    // Remove from DB
    await dbDeletePlugin(id);

    // Remove from memory
    this.plugins.delete(id);
    this.notify();
  }

  async enablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin not found: ${id}`);

    await updatePluginEnabled(id, true);
    plugin.enabled = true;
    this.plugins.set(id, { ...plugin });
    this.notify();

    // Start the plugin sidecar
    await this.startPlugin(id);
  }

  async disablePlugin(id: string): Promise<void> {
    await this.stopPlugin(id);

    await updatePluginEnabled(id, false);
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.enabled = false;
      plugin.status = "disabled";
      this.plugins.set(id, { ...plugin });
    }
    this.notify();
  }

  async updateSettings(id: string, settings: Record<string, unknown>): Promise<void> {
    await updatePluginSettings(id, settings);
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.settings = settings;
      this.plugins.set(id, { ...plugin });
    }
    this.notify();
  }

  // ============================================
  // PLUGIN SIDECAR MANAGEMENT
  // ============================================

  private async startPlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Plugin not found: ${id}`);

    if (this.hostStatus !== "running" || !this.hostPort || !this.hostToken) {
      console.warn(`[PluginManager] Host not ready, deferring plugin start: ${id}`);
      return;
    }

    plugin.status = "starting";
    this.plugins.set(id, { ...plugin });
    this.notify();

    try {
      const { exists } = await import("@tauri-apps/plugin-fs");
      const { join } = await import("@tauri-apps/api/path");

      let spawnInfo = getSpawnCommand(plugin.manifest);

      // Dev mode: if the built entry doesn't exist, fall back to TypeScript source via tsx
      const entryAbsolute = await join(plugin.installPath, plugin.manifest.entry);
      if (!(await exists(entryAbsolute))) {
        // Try the TypeScript source equivalent: dist/index.js → src/index.ts
        const tsEntry = plugin.manifest.entry
          .replace(/^dist\//, "src/")
          .replace(/\.js$/, ".ts");
        const tsAbsolute = await join(plugin.installPath, tsEntry);

        if (await exists(tsAbsolute)) {
          console.log(`[PluginManager] Dev mode: using tsx for ${id} (${tsEntry})`);
          spawnInfo = { command: "npx", args: ["tsx", tsAbsolute] };
        } else {
          throw new Error(`Plugin entry not found: ${entryAbsolute} (and no TypeScript source at ${tsAbsolute})`);
        }
      } else {
        // Built entry exists — use absolute path
        spawnInfo = { command: spawnInfo.command, args: [entryAbsolute] };
      }

      const cmd = Command.create(spawnInfo.command, spawnInfo.args, {
        env: {
          CONTINUITY_HOST_URL: `ws://127.0.0.1:${this.hostPort}`,
          CONTINUITY_AUTH_TOKEN: this.hostToken,
          CONTINUITY_PLUGIN_ID: id,
          // Pass plugin settings as env (for simple access)
          ...Object.fromEntries(
            Object.entries(plugin.settings).map(([k, v]) => [
              `PLUGIN_${k.toUpperCase()}`,
              String(v),
            ])
          ),
        },
      });

      cmd.stderr.on("data", (line: string) => {
        console.log(`[Plugin:${id}] ${line}`);
      });

      cmd.on("error", (error: string) => {
        console.error(`[PluginManager] Plugin ${id} error:`, error);
        const p = this.plugins.get(id);
        if (p) {
          p.status = "error";
          p.error = error;
          this.plugins.set(id, { ...p });
          this.notify();
        }
      });

      cmd.on("close", () => {
        console.log(`[PluginManager] Plugin ${id} process exited`);
        this.pluginProcesses.delete(id);
        const p = this.plugins.get(id);
        if (p && p.status === "running") {
          p.status = p.enabled ? "disabled" : "installed";
          this.plugins.set(id, { ...p });
          this.notify();
        }
      });

      const child = await cmd.spawn();
      this.pluginProcesses.set(id, child);
    } catch (err) {
      plugin.status = "error";
      plugin.error = err instanceof Error ? err.message : String(err);
      this.plugins.set(id, { ...plugin });
      this.notify();
    }
  }

  private async stopPlugin(id: string): Promise<void> {
    const child = this.pluginProcesses.get(id);
    if (child) {
      try {
        await child.kill();
      } catch {
        // Process may already be dead
      }
      this.pluginProcesses.delete(id);
    }

    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.status = "stopping";
      this.plugins.set(id, { ...plugin });
      this.notify();
    }
  }

  // ============================================
  // STATE ACCESS
  // ============================================

  getState(): PluginManagerState {
    return {
      hostStatus: this.hostStatus,
      hostPort: this.hostPort,
      plugins: Array.from(this.plugins.values()),
      panels: this.panels,
      tools: this.tools,
      prompts: this.prompts,
    };
  }

  getHostInfo(): { port: number | null; token: string | null; status: string } {
    return {
      port: this.hostPort,
      token: this.hostToken,
      status: this.hostStatus,
    };
  }

  getPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(id: string): PluginInfo | undefined {
    return this.plugins.get(id);
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
