/**
 * Plugin System Type Definitions
 *
 * Types for the Continuity plugin system. Plugins are standalone sidecar
 * processes that communicate with the host app over a local WebSocket API.
 */

// ============================================
// PLUGIN CAPABILITIES
// ============================================

/** Granular capability declarations for plugin permissions */
export type PluginCapability =
  | "db:read"
  | "db:write"
  | "db:subscribe"
  | "events:memories"
  | "events:threads"
  | "events:chat"
  | "events:mcp"
  | "events:app"
  | "mcp:read"
  | "mcp:control"
  | "chat:tools"
  | "chat:prompts"
  | "ui:sidebar"
  | "ui:settings"
  | "ui:statusbar"
  | "ui:notifications";

// ============================================
// PLUGIN MANIFEST (continuity-plugin.json)
// ============================================

export type PluginRuntime = "node" | "python" | "deno";

export type PluginSettingType = "string" | "number" | "boolean" | "secret" | "select";

export interface PluginSettingDefinition {
  key: string;
  type: PluginSettingType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: string | number | boolean;
  options?: { label: string; value: string }[]; // for "select" type
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  license?: string;
  icon?: string;

  runtime: PluginRuntime;
  entry: string;

  capabilities: PluginCapability[];
  settings?: PluginSettingDefinition[];
}

// ============================================
// PLUGIN STATE (runtime)
// ============================================

export type PluginStatus =
  | "installed"     // installed but never enabled
  | "disabled"      // explicitly disabled
  | "starting"      // sidecar process spawning
  | "running"       // connected and active
  | "error"         // failed to start or crashed
  | "stopping";     // graceful shutdown in progress

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  manifest: PluginManifest;
  status: PluginStatus;
  enabled: boolean;
  installPath: string;
  source: string;            // "github:user/repo", "local:/path", "npm:package"
  settings: Record<string, unknown>;
  error?: string;
  installedAt: string;
  updatedAt: string;
}

// ============================================
// PLUGIN HOST PROTOCOL (JSON-RPC over WebSocket)
// ============================================

/** JSON-RPC 2.0 request from plugin to host */
export interface PluginRPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 response from host to plugin */
export interface PluginRPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** JSON-RPC 2.0 notification (no response expected) */
export interface PluginRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export type PluginRPCMessage =
  | PluginRPCRequest
  | PluginRPCResponse
  | PluginRPCNotification;

// ============================================
// HOST API METHOD TYPES
// ============================================

/** db.query params and result */
export interface DbQueryParams {
  sql: string;
  params: unknown[];
}

export interface DbQueryResult {
  rows: Record<string, unknown>[];
}

/** db.execute params and result */
export interface DbExecuteParams {
  sql: string;
  params: unknown[];
}

export interface DbExecuteResult {
  rowsAffected: number;
}

/** db.subscribe params */
export interface DbSubscribeParams {
  table: string;
  events: ("insert" | "update" | "delete")[];
}

/** events.subscribe params */
export interface EventsSubscribeParams {
  events: string[];
}

/** chat.registerTool params */
export interface ChatRegisterToolParams {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** chat.injectPrompt params */
export interface ChatInjectPromptParams {
  id: string;
  content: string;
  position: "system" | "context";
}

/** ui.registerPanel params */
export interface UIRegisterPanelParams {
  slot: "sidebar" | "settings" | "statusbar";
  label: string;
  icon: string;
  url: string;
}

/** ui.showNotification params */
export interface UIShowNotificationParams {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

/** ui.updateBadge params */
export interface UIUpdateBadgeParams {
  slot: string;
  count: number;
}

/** settings.get params */
export interface SettingsGetParams {
  key: string;
}

/** settings.set params */
export interface SettingsSetParams {
  key: string;
  value: unknown;
}

// ============================================
// PLUGIN HOST CONFIG
// ============================================

/** Passed to Plugin Host process on startup */
export interface PluginHostConfig {
  port: number;
  appDbPath: string;
  memoryDbPath: string;
  pluginsDir: string;
}

/** Registered UI panel from a plugin */
export interface RegisteredPanel {
  pluginId: string;
  slot: "sidebar" | "settings" | "statusbar";
  label: string;
  icon: string;
  url: string;
}

/** Registered tool from a plugin */
export interface RegisteredTool {
  pluginId: string;
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Injected prompt from a plugin */
export interface RegisteredPrompt {
  pluginId: string;
  id: string;
  content: string;
  position: "system" | "context";
}
