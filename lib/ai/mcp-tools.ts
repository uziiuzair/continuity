/**
 * MCP Tools for AI
 *
 * Bridges MCP server tools into the existing AI tool system.
 * Dynamically exposes tools from connected MCP servers as ToolDefinitions,
 * enabling the AI to discover and call external tools at runtime.
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import { MCPManager } from "@/lib/mcp/manager";

// ============================================
// TOOL DEFINITIONS (dynamic from MCP servers)
// ============================================

/**
 * Get all currently available MCP tools as ToolDefinitions.
 * This is dynamic — the list changes as servers connect/disconnect.
 */
export function getMCPToolDefinitions(): ToolDefinition[] {
  const mcpTools = MCPManager.getInstance().getAllMCPTools();

  return mcpTools.map((tool) => ({
    name: tool.qualifiedName,
    description:
      tool.description || `MCP tool: ${tool.name} from ${tool.serverId}`,
    parameters:
      tool.inputSchema &&
      typeof tool.inputSchema === "object" &&
      "type" in tool.inputSchema &&
      tool.inputSchema.type === "object" &&
      "properties" in tool.inputSchema
        ? {
            type: "object" as const,
            properties: (tool.inputSchema.properties ?? {}) as Record<
              string,
              unknown
            >,
            required: ((tool.inputSchema.required ?? []) as string[]),
          }
        : {
            type: "object" as const,
            properties: {},
            required: [],
          },
  }));
}

/**
 * Get names of all currently available MCP tools.
 */
export function getMCPToolNames(): string[] {
  return getMCPToolDefinitions().map((t) => t.name);
}

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute an MCP tool call and return the result.
 * The tool name should be the qualifiedName (serverId__toolName).
 */
export async function executeMCPTool(toolCall: ToolCall): Promise<ToolResult> {
  try {
    const rawResult = await MCPManager.getInstance().callTool(
      toolCall.name,
      toolCall.arguments
    );

    // MCP results are typically { content: [{ type: "text", text: "..." }] }
    let formattedResult: string;

    if (
      rawResult &&
      typeof rawResult === "object" &&
      "content" in rawResult &&
      Array.isArray((rawResult as Record<string, unknown>).content)
    ) {
      const content = (rawResult as Record<string, unknown>)
        .content as Array<Record<string, unknown>>;
      formattedResult = content
        .map((item) => {
          if (item.type === "text" && typeof item.text === "string") {
            return item.text;
          }
          return JSON.stringify(item);
        })
        .join("\n");
    } else if (typeof rawResult === "string") {
      formattedResult = rawResult;
    } else {
      formattedResult = JSON.stringify(rawResult, null, 2);
    }

    return {
      toolCallId: toolCall.id,
      result: formattedResult,
      success: true,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: `MCP tool error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

// ============================================
// MCP APPS HELPERS
// ============================================

/**
 * Check if an MCP tool has an associated App UI.
 * Returns the ui:// resource URI if present, undefined otherwise.
 */
export function getMCPToolUIResourceUri(
  qualifiedName: string
): string | undefined {
  const mcpTools = MCPManager.getInstance().getAllMCPTools();
  const tool = mcpTools.find((t) => t.qualifiedName === qualifiedName);
  return tool?._meta?.ui?.resourceUri;
}

/**
 * Extract serverId from a qualified tool name "serverId__toolName".
 */
export function getServerIdFromQualifiedName(
  qualifiedName: string
): string | undefined {
  const separatorIndex = qualifiedName.indexOf("__");
  if (separatorIndex === -1) return undefined;
  return qualifiedName.slice(0, separatorIndex);
}

/**
 * Fetch the HTML for an MCP App UI resource via resources/read.
 * Returns the HTML string if successful, undefined otherwise.
 */
export async function fetchMCPAppHtml(
  serverId: string,
  resourceUri: string
): Promise<string | undefined> {
  try {
    const result = await MCPManager.getInstance().readResource(
      serverId,
      resourceUri
    );

    // MCP resources/read returns { contents: [{ uri, text?, blob?, mimeType? }] }
    if (
      result &&
      typeof result === "object" &&
      "contents" in result &&
      Array.isArray((result as Record<string, unknown>).contents)
    ) {
      const contents = (result as Record<string, unknown>)
        .contents as Array<Record<string, unknown>>;
      const htmlContent = contents.find(
        (c) =>
          typeof c.text === "string" &&
          (c.mimeType === "text/html" ||
            c.mimeType === "text/html;profile=mcp-app" ||
            (c.uri as string)?.startsWith("ui://"))
      );
      if (htmlContent && typeof htmlContent.text === "string") {
        return htmlContent.text;
      }
      // Fallback: return first text content
      const firstText = contents.find((c) => typeof c.text === "string");
      if (firstText && typeof firstText.text === "string") {
        return firstText.text;
      }
    }

    return undefined;
  } catch (error) {
    console.error(
      `[MCP Apps] Failed to fetch HTML for ${resourceUri} from ${serverId}:`,
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
}

// ============================================
// SYSTEM PROMPT FOR MCP TOOLS
// ============================================

/**
 * Generate a system prompt section describing available MCP tools.
 * Returns empty string if no MCP tools are available.
 */
export function getMCPToolsSystemPrompt(): string {
  const tools = getMCPToolDefinitions();

  if (tools.length === 0) {
    return "";
  }

  // Group tools by server
  const toolsByServer = new Map<string, ToolDefinition[]>();
  for (const tool of tools) {
    // qualifiedName format: serverId__toolName
    const separatorIndex = tool.name.indexOf("__");
    const serverId =
      separatorIndex !== -1 ? tool.name.slice(0, separatorIndex) : "unknown";

    const existing = toolsByServer.get(serverId) ?? [];
    existing.push(tool);
    toolsByServer.set(serverId, existing);
  }

  // Get server names from MCPManager states
  const serverStates = MCPManager.getInstance().getServerStates();
  const serverNameMap = new Map<string, string>();
  for (const state of serverStates) {
    serverNameMap.set(state.config.id, state.config.name);
  }

  const lines: string[] = [
    "You have access to external tools from connected MCP servers:",
    "",
  ];

  for (const [serverId, serverTools] of toolsByServer) {
    const serverName = serverNameMap.get(serverId) || serverId;
    lines.push(`## Server: ${serverName}`);

    for (const tool of serverTools) {
      // Extract the short tool name from qualifiedName
      const separatorIndex = tool.name.indexOf("__");
      const shortName =
        separatorIndex !== -1 ? tool.name.slice(separatorIndex + 2) : tool.name;
      lines.push(`- **${shortName}** - ${tool.description}`);
    }

    lines.push("");
  }

  lines.push(
    "When using MCP tools, provide arguments matching the tool's input schema. Results will be returned as text."
  );

  return lines.join("\n");
}
