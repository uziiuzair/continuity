/**
 * Memory Tools for AI
 *
 * Tools that allow the AI to remember, recall, and forget information
 * across conversations. Now backed by the unified memory.db — the same
 * database that external tools (Claude Code, Cursor, Windsurf) access
 * via the MCP server.
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import {
  getMemory,
  setMemory,
  getAllMemories,
  deleteMemory,
  searchMemories,
} from "@/lib/db/memories";
import { getMemoryDb } from "@/lib/db/memory-db";
import { isTauriContext } from "@/lib/db";
import type { McpMemory, McpProject, MemoryType } from "@/providers/memories-provider";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const MEMORY_TOOLS: ToolDefinition[] = [
  {
    name: "remember",
    description:
      "Store a fact or piece of information for future conversations. Memories are shared across this app AND external AI tools (Claude Code, Cursor, Windsurf) connected via MCP.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "A descriptive key for the memory (e.g., 'user_name', 'preferred_language', 'project_tech_stack')",
        },
        value: {
          type: "string",
          description: "The value to remember",
        },
        type: {
          type: "string",
          enum: ["decision", "preference", "context", "constraint", "pattern"],
          description:
            "Memory type. Use 'preference' for user prefs, 'decision' for choices made, 'context' for general info, 'constraint' for limitations, 'pattern' for recurring patterns. Defaults to 'context'.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional tags for categorization (e.g., ['user', 'settings'] or ['project', 'tech-stack'])",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "recall",
    description:
      "Retrieve stored memories. Call with a specific key to get one memory, or with no key to see all stored memories. You can also search for memories containing a pattern.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Specific key to recall (optional - omit to see all memories)",
        },
        search: {
          type: "string",
          description:
            "Search pattern to find memories (optional - searches both keys and content)",
        },
      },
      required: [],
    },
  },
  {
    name: "forget",
    description:
      "Archive a stored memory. The memory is soft-deleted (archived, not permanently removed) so history is preserved. Use when the user explicitly asks you to forget something or when information is no longer relevant.",
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "The key of the memory to forget",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "list_projects",
    description:
      "List all active projects. Projects are scope containers that organize memories. Each project has a name, description, and optional filesystem path.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_project",
    description:
      "Get a project's details and all its associated memories. Use this to dive deep into a specific project's context, decisions, constraints, and patterns.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The project ID (e.g., 'proj-4f5c387d')",
        },
      },
      required: ["id"],
    },
  },
];

export const MEMORY_TOOL_NAMES = MEMORY_TOOLS.map((t) => t.name);

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute a memory tool and return the result
 */
export async function executeMemoryTool(
  toolCall: ToolCall
): Promise<ToolResult> {
  if (!isTauriContext()) {
    return {
      toolCallId: toolCall.id,
      result: "Error: Memory operations require Tauri context",
      success: false,
    };
  }

  try {
    switch (toolCall.name) {
      case "remember":
        return await executeRemember(
          toolCall.id,
          toolCall.arguments as {
            key: string;
            value: string;
            type?: MemoryType;
            tags?: string[];
          }
        );

      case "recall":
        return await executeRecall(
          toolCall.id,
          toolCall.arguments as { key?: string; search?: string }
        );

      case "forget":
        return await executeForget(
          toolCall.id,
          toolCall.arguments as { key: string }
        );

      case "list_projects":
        return await executeListProjects(toolCall.id);

      case "get_project":
        return await executeGetProject(
          toolCall.id,
          toolCall.arguments as { id: string }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown memory tool: ${toolCall.name}`,
          success: false,
        };
    }
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

// ============================================
// INDIVIDUAL TOOL EXECUTORS
// ============================================

/**
 * Store a memory
 */
async function executeRemember(
  toolCallId: string,
  args: { key: string; value: string; type?: MemoryType; tags?: string[] }
): Promise<ToolResult> {
  if (!args.key?.trim()) {
    return {
      toolCallId,
      result: "No key provided for memory.",
      success: false,
    };
  }

  if (!args.value?.trim()) {
    return {
      toolCallId,
      result: "No value provided for memory.",
      success: false,
    };
  }

  // Normalize the key (lowercase, underscores for spaces)
  const normalizedKey = args.key
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  const memoryType = args.type || "context";
  await setMemory(normalizedKey, args.value.trim(), "global", memoryType, args.tags);

  return {
    toolCallId,
    result: `Remembered: "${normalizedKey}" = "${args.value.trim()}" (type: ${memoryType})`,
    success: true,
  };
}

/**
 * Format a memory for display
 */
function formatMemory(mem: McpMemory): string {
  const parts = [`**${mem.key}**: ${mem.content}`];
  const meta: string[] = [];
  if (mem.type && mem.type !== "context") meta.push(`type: ${mem.type}`);
  if (mem.tags) {
    try {
      const tags = JSON.parse(mem.tags);
      if (Array.isArray(tags) && tags.length > 0) meta.push(`tags: ${tags.join(", ")}`);
    } catch { /* ignore */ }
  }
  if (mem.version > 1) meta.push(`v${mem.version}`);
  if (meta.length > 0) parts.push(`(${meta.join(", ")})`);
  return `- ${parts.join(" ")}`;
}

/**
 * Recall memories
 */
async function executeRecall(
  toolCallId: string,
  args: { key?: string; search?: string }
): Promise<ToolResult> {
  // If a specific key is provided, get that memory
  if (args.key?.trim()) {
    const normalizedKey = args.key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

    const memory = await getMemory(normalizedKey);

    if (!memory) {
      return {
        toolCallId,
        result: `No memory found for key: "${normalizedKey}"`,
        success: true,
      };
    }

    return {
      toolCallId,
      result: `Memory found:\n${formatMemory(memory)}`,
      success: true,
    };
  }

  // If a search pattern is provided, search memories
  if (args.search?.trim()) {
    const memories = await searchMemories(args.search.trim());

    if (memories.length === 0) {
      return {
        toolCallId,
        result: `No memories found matching: "${args.search}"`,
        success: true,
      };
    }

    const lines = [
      `Found ${memories.length} memories matching "${args.search}":`,
    ];
    for (const mem of memories) {
      lines.push(formatMemory(mem));
    }

    return {
      toolCallId,
      result: lines.join("\n"),
      success: true,
    };
  }

  // Otherwise, get all memories
  const memories = await getAllMemories();

  if (memories.length === 0) {
    return {
      toolCallId,
      result: "No memories stored yet.",
      success: true,
    };
  }

  const lines = [`Stored memories (${memories.length} total):`];
  for (const mem of memories) {
    lines.push(formatMemory(mem));
  }

  return {
    toolCallId,
    result: lines.join("\n"),
    success: true,
  };
}

/**
 * Forget (archive) a memory
 */
async function executeForget(
  toolCallId: string,
  args: { key: string }
): Promise<ToolResult> {
  if (!args.key?.trim()) {
    return {
      toolCallId,
      result: "No key provided.",
      success: false,
    };
  }

  const normalizedKey = args.key
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");

  // Check if memory exists first
  const existing = await getMemory(normalizedKey);
  if (!existing) {
    return {
      toolCallId,
      result: `No memory found for key: "${normalizedKey}"`,
      success: false,
    };
  }

  await deleteMemory(normalizedKey);

  return {
    toolCallId,
    result: `Archived memory: "${normalizedKey}" (history preserved)`,
    success: true,
  };
}

// ============================================
// PROJECT TOOL EXECUTORS
// ============================================

/**
 * List all active projects
 */
async function executeListProjects(
  toolCallId: string
): Promise<ToolResult> {
  const db = await getMemoryDb();
  const projects = await db.select<McpProject[]>(
    "SELECT * FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC"
  );

  if (projects.length === 0) {
    return {
      toolCallId,
      result: "No projects found.",
      success: true,
    };
  }

  const lines = [`Found ${projects.length} projects:`];
  for (const proj of projects) {
    const desc = proj.description ? ` — ${proj.description}` : "";
    lines.push(`- **${proj.name}**${desc} (id: ${proj.id})`);
  }

  return {
    toolCallId,
    result: lines.join("\n"),
    success: true,
  };
}

/**
 * Get a project and its memories
 */
async function executeGetProject(
  toolCallId: string,
  args: { id: string }
): Promise<ToolResult> {
  if (!args.id?.trim()) {
    return {
      toolCallId,
      result: "No project ID provided.",
      success: false,
    };
  }

  const db = await getMemoryDb();
  const projects = await db.select<McpProject[]>(
    "SELECT * FROM projects WHERE id = $1",
    [args.id]
  );

  if (projects.length === 0) {
    return {
      toolCallId,
      result: `Project not found: ${args.id}`,
      success: false,
    };
  }

  const project = projects[0];
  const memories = await db.select<McpMemory[]>(
    "SELECT * FROM memories WHERE project_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC",
    [args.id]
  );

  const lines = [
    `## ${project.name}`,
    project.description ? project.description : "",
    project.path ? `Path: ${project.path}` : "",
    "",
    `**${memories.length} memories:**`,
  ];

  for (const mem of memories) {
    const typeTag = mem.type !== "context" ? ` [${mem.type}]` : "";
    lines.push(`- **${mem.key}**${typeTag}: ${mem.content.slice(0, 200)}${mem.content.length > 200 ? "..." : ""}`);
  }

  return {
    toolCallId,
    result: lines.filter(Boolean).join("\n"),
    success: true,
  };
}

// ============================================
// MEMORY CONTEXT FOR SYSTEM PROMPT INJECTION
// ============================================

const MAX_MEMORIES_IN_PROMPT = 50;
const MAX_PROMPT_CHARS = 4000;

/**
 * Load memories and format them for injection into the system prompt.
 * Groups memories by type for easy scanning by the AI.
 */
export async function getMemoryContext(): Promise<string | null> {
  if (!isTauriContext()) return null;

  try {
    // Load ALL memories (global + project-scoped) — these may have been
    // written by Claude Code, Cursor, or other MCP-connected tools
    const memories = await getAllMemories();
    if (memories.length === 0) return null;

    // Take most recent memories up to limit
    const limited = memories.slice(0, MAX_MEMORIES_IN_PROMPT);

    // Group by type
    const grouped: Record<string, McpMemory[]> = {};
    for (const mem of limited) {
      const type = mem.type || "context";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(mem);
    }

    const typeLabels: Record<string, string> = {
      preference: "Preferences",
      decision: "Decisions",
      context: "Context",
      constraint: "Constraints",
      pattern: "Patterns",
    };

    const typeOrder = ["preference", "decision", "context", "constraint", "pattern"];

    const lines: string[] = [
      "## Your Memories",
      "",
      "You have the following stored memories. Use them silently to inform your responses.",
      "Do NOT repeat these to the user unless asked. Use them to personalize your behavior.",
      "",
    ];

    let totalChars = lines.join("\n").length;

    for (const type of typeOrder) {
      const mems = grouped[type];
      if (!mems || mems.length === 0) continue;

      const header = `### ${typeLabels[type] || type}`;
      lines.push(header);
      totalChars += header.length + 1;

      for (const mem of mems) {
        const versionTag = mem.version > 1 ? ` (v${mem.version})` : "";
        const line = `- ${mem.key}: ${mem.content}${versionTag}`;

        if (totalChars + line.length > MAX_PROMPT_CHARS) {
          lines.push(`- ... and ${limited.length - lines.filter((l) => l.startsWith("- ")).length} more memories`);
          return lines.join("\n");
        }

        lines.push(line);
        totalChars += line.length + 1;
      }

      lines.push("");
    }

    return lines.join("\n").trim();
  } catch {
    return null;
  }
}

// ============================================
// SYSTEM PROMPT ADDITION FOR MEMORY TOOLS
// ============================================

export const MEMORY_TOOLS_SYSTEM_PROMPT = `
You have tools for persistent memory and project management.
Memories are shared with external AI tools (Claude Code, Cursor, Windsurf) connected via MCP.
Your stored memories are pre-loaded above in the "Your Memories" section — use them silently.

## Memory Tools

1. **remember** - Store information for future conversations. Use this when:
   - User tells you their name or preferences
   - User shares project details you should remember
   - User explicitly asks you to "remember this"
   - Important context that should persist
   - You can optionally set a type (decision, preference, context, constraint, pattern) and tags

2. **recall** - Retrieve stored memories. Use this when:
   - You need to search for a specific memory not shown above
   - User asks "what do you know about me?"
   - You don't need to call recall at the start of every conversation — memories are pre-loaded

3. **forget** - Archive stored memories (soft-delete, history preserved). Use this when:
   - User explicitly asks you to forget something
   - Information is outdated or incorrect

## Project Tools

4. **list_projects** - List all active projects. Use this when:
   - User asks about their projects, workstreams, or what they're working on
   - You need to see what project scopes exist
   - User says "my projects", "active projects", "what am I working on"

5. **get_project** - Get a project's details and all its memories. Use this when:
   - User asks to dive into a specific project
   - You need full context on a project (decisions, constraints, patterns)
   - Pass the project ID from list_projects

## Important guidelines:

- Use descriptive keys like "user_name", "preferred_language", "project_tech_stack"
- Don't remember sensitive information like passwords or API keys
- Check existing memories (pre-loaded above or via recall) before remembering to avoid duplicates
- Memories persist across all conversations AND across all connected AI tools
- When remembering, choose an appropriate type: preference, decision, context, constraint, or pattern
- When user asks about projects, use list_projects first, then get_project for details
`.trim();
