/**
 * Memory Tools for AI
 *
 * Tools that allow the AI to remember, recall, and forget information
 * across conversations. Persistent storage for user preferences,
 * project context, and important facts.
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import {
  getMemory,
  setMemory,
  getAllMemories,
  deleteMemory,
  searchMemories,
} from "@/lib/db/memories";
import { isTauriContext } from "@/lib/db";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const MEMORY_TOOLS: ToolDefinition[] = [
  {
    name: "remember",
    description:
      "Store a fact or piece of information for future conversations. Use this to remember user preferences, project details, important context, or any information the user wants you to remember.",
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
          description: "Specific key to recall (optional - omit to see all memories)",
        },
        search: {
          type: "string",
          description:
            "Search pattern to find memories (optional - searches both keys and values)",
        },
      },
      required: [],
    },
  },
  {
    name: "forget",
    description:
      "Remove a stored memory. Use when the user explicitly asks you to forget something or when information is no longer relevant.",
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
          toolCall.arguments as { key: string; value: string }
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
  args: { key: string; value: string }
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

  await setMemory(normalizedKey, args.value.trim());

  return {
    toolCallId,
    result: `Remembered: "${normalizedKey}" = "${args.value.trim()}"`,
    success: true,
  };
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
        success: true, // Not an error, just no data
      };
    }

    return {
      toolCallId,
      result: `Memory "${normalizedKey}": ${memory.value}`,
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

    const lines = [`Found ${memories.length} memories matching "${args.search}":`];
    for (const mem of memories) {
      lines.push(`- **${mem.key}**: ${mem.value}`);
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
    lines.push(`- **${mem.key}**: ${mem.value}`);
  }

  return {
    toolCallId,
    result: lines.join("\n"),
    success: true,
  };
}

/**
 * Forget a memory
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
    result: `Forgot memory: "${normalizedKey}"`,
    success: true,
  };
}

// ============================================
// SYSTEM PROMPT ADDITION FOR MEMORY TOOLS
// ============================================

export const MEMORY_TOOLS_SYSTEM_PROMPT = `
You have tools for persistent memory across conversations:

1. **remember** - Store information for future conversations. Use this when:
   - User tells you their name or preferences
   - User shares project details you should remember
   - User explicitly asks you to "remember this"
   - Important context that should persist

2. **recall** - Retrieve stored memories. Use this when:
   - User asks "what do you know about me?"
   - You need to check if you have relevant stored context
   - User references something they told you before

3. **forget** - Remove stored memories. Use this when:
   - User explicitly asks you to forget something
   - Information is outdated or incorrect

## Important guidelines:

- Use descriptive keys like "user_name", "preferred_language", "project_tech_stack"
- Don't remember sensitive information like passwords or API keys
- Check existing memories with recall before remembering to avoid duplicates
- Memories persist across all conversations in this workspace
`.trim();
