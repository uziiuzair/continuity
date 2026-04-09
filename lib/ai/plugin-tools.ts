/**
 * Plugin Tools for AI
 *
 * Bridges plugin-registered tools into the AI tool system.
 * Plugin tools are registered dynamically by connected plugins
 * via the Plugin Host WebSocket API.
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import { PluginManager } from "@/lib/plugins/manager";

/** Prefix for plugin tools to avoid name collisions */
const PLUGIN_TOOL_PREFIX = "plugin__";

/**
 * Get all currently available plugin tools as ToolDefinitions.
 * Dynamic — changes as plugins connect/disconnect and register tools.
 */
export function getPluginToolDefinitions(): ToolDefinition[] {
  const manager = PluginManager.getInstance();
  const state = manager.getState();

  return state.tools.map((tool) => ({
    name: `${PLUGIN_TOOL_PREFIX}${tool.pluginId}__${tool.name}`,
    description: tool.description,
    parameters: {
      type: "object" as const,
      properties: tool.parameters.properties,
      required: tool.parameters.required ?? [],
    },
  }));
}

/**
 * Get names of all currently available plugin tools.
 */
export function getPluginToolNames(): string[] {
  return getPluginToolDefinitions().map((t) => t.name);
}

/**
 * Check if a tool name belongs to a plugin tool.
 */
export function isPluginTool(toolName: string): boolean {
  return toolName.startsWith(PLUGIN_TOOL_PREFIX);
}

/**
 * Execute a plugin tool call by forwarding to the Plugin Host.
 */
export async function executePluginTool(toolCall: ToolCall): Promise<ToolResult> {
  try {
    // Parse: plugin__pluginId__toolName
    const withoutPrefix = toolCall.name.slice(PLUGIN_TOOL_PREFIX.length);
    const separatorIndex = withoutPrefix.indexOf("__");
    if (separatorIndex === -1) {
      throw new Error(`Invalid plugin tool name: ${toolCall.name}`);
    }

    const pluginId = withoutPrefix.slice(0, separatorIndex);
    const toolName = withoutPrefix.slice(separatorIndex + 2);

    // TODO: Route through Plugin Host WebSocket
    // For now, this is a placeholder — full implementation requires
    // the frontend to connect to the Plugin Host WS and forward calls.
    // The Plugin Host's server.callPluginTool() handles the actual routing.

    const manager = PluginManager.getInstance();
    const hostInfo = manager.getHostInfo();

    if (hostInfo.status !== "running" || !hostInfo.port || !hostInfo.token) {
      throw new Error("Plugin Host is not running");
    }

    // Make a direct HTTP-style call via WebSocket
    // The PluginManager handles this internally
    const result = await callPluginToolViaHost(
      hostInfo.port,
      hostInfo.token,
      pluginId,
      toolName,
      toolCall.arguments
    );

    return {
      toolCallId: toolCall.id,
      result: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      success: true,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: `Plugin tool error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

/**
 * Call a plugin tool through the Plugin Host's WebSocket API.
 * Uses a one-shot WebSocket connection for the RPC call.
 */
async function callPluginToolViaHost(
  port: number,
  token: string,
  pluginId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}?token=${token}&pluginId=__frontend__`
    );

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Plugin tool call timed out"));
    }, 30000);

    ws.onopen = () => {
      const request = {
        jsonrpc: "2.0",
        id: 1,
        method: "plugin.callTool",
        params: { pluginId, toolName, arguments: args },
      };
      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(event.data as string);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      } catch (err) {
        reject(new Error("Invalid response from Plugin Host"));
      }
      ws.close();
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(new Error("WebSocket error connecting to Plugin Host"));
    };
  });
}

/**
 * Generate a system prompt section describing available plugin tools.
 */
export function getPluginToolsSystemPrompt(): string {
  const tools = getPluginToolDefinitions();
  if (tools.length === 0) return "";

  const lines: string[] = [
    "You also have access to tools from installed plugins:",
    "",
  ];

  // Group by plugin
  const toolsByPlugin = new Map<string, ToolDefinition[]>();
  for (const tool of tools) {
    const withoutPrefix = tool.name.slice(PLUGIN_TOOL_PREFIX.length);
    const sep = withoutPrefix.indexOf("__");
    const pluginId = sep !== -1 ? withoutPrefix.slice(0, sep) : "unknown";

    const existing = toolsByPlugin.get(pluginId) ?? [];
    existing.push(tool);
    toolsByPlugin.set(pluginId, existing);
  }

  for (const [pluginId, pluginTools] of toolsByPlugin) {
    const manager = PluginManager.getInstance();
    const plugin = manager.getPlugin(pluginId);
    const displayName = plugin?.name || pluginId;

    lines.push(`## Plugin: ${displayName}`);
    for (const tool of pluginTools) {
      const shortName = tool.name.split("__").pop() || tool.name;
      lines.push(`- **${shortName}** - ${tool.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
