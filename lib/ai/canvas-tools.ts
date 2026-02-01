/**
 * Canvas Tools for AI
 *
 * Defines tools that AI can call to interact with the canvas.
 * These tools enable reading, creating, updating, and deleting canvas content.
 */

import { SimpleBlock } from "@/lib/canvas";
import {
  getCanvasContent,
  saveCanvasContent,
  appendCanvasBlocks,
} from "@/lib/db/canvas";
import { CanvasContent } from "@/types";
import { isTauriContext } from "@/lib/db";

// ============================================
// TOOL DEFINITIONS (for AI)
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const CANVAS_TOOLS: ToolDefinition[] = [
  {
    name: "read_canvas",
    description:
      "Read the current contents of the canvas. Returns all blocks with their IDs, types, and content. Use this to see what's currently in the canvas before making updates.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "add_to_canvas",
    description:
      "Add new blocks to the canvas. Use this to create new content like paragraphs, headings, checklists, bullet points, etc.",
    parameters: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          description: "Array of blocks to add",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "paragraph",
                  "heading",
                  "bulletListItem",
                  "numberedListItem",
                  "checkListItem",
                  "codeBlock",
                ],
                description: "The type of block",
              },
              content: {
                type: "string",
                description: "The text content of the block",
              },
              props: {
                type: "object",
                description:
                  "Optional properties. For heading: {level: 1|2|3}. For checkListItem: {checked: boolean}. For codeBlock: {language: string}",
              },
            },
            required: ["type", "content"],
          },
        },
      },
      required: ["blocks"],
    },
  },
  {
    name: "update_block",
    description:
      "Update an existing block in the canvas. Can change content, type, or properties (like marking a checkbox as checked).",
    parameters: {
      type: "object",
      properties: {
        blockId: {
          type: "string",
          description: "The ID of the block to update",
        },
        content: {
          type: "string",
          description: "New text content (optional)",
        },
        props: {
          type: "object",
          description:
            "New properties to merge (optional). For checkListItem, use {checked: true} to mark complete.",
        },
      },
      required: ["blockId"],
    },
  },
  {
    name: "delete_block",
    description: "Delete a block from the canvas by its ID.",
    parameters: {
      type: "object",
      properties: {
        blockId: {
          type: "string",
          description: "The ID of the block to delete",
        },
      },
      required: ["blockId"],
    },
  },
];

// ============================================
// TOOL EXECUTION
// ============================================

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: string;
  success: boolean;
}

/**
 * Execute a canvas tool and return the result
 */
export async function executeCanvasTool(
  toolCall: ToolCall,
  threadId: string
): Promise<ToolResult> {
  if (!isTauriContext()) {
    return {
      toolCallId: toolCall.id,
      result: "Error: Database operations require Tauri context",
      success: false,
    };
  }

  try {
    switch (toolCall.name) {
      case "read_canvas":
        return await executeReadCanvas(toolCall.id, threadId);

      case "add_to_canvas":
        return await executeAddToCanvas(
          toolCall.id,
          threadId,
          toolCall.arguments as { blocks: SimpleBlock[] }
        );

      case "update_block":
        return await executeUpdateBlock(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            blockId: string;
            content?: string;
            props?: Record<string, unknown>;
          }
        );

      case "delete_block":
        return await executeDeleteBlock(
          toolCall.id,
          threadId,
          toolCall.arguments as { blockId: string }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown tool: ${toolCall.name}`,
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

/**
 * Read canvas content
 */
async function executeReadCanvas(
  toolCallId: string,
  threadId: string
): Promise<ToolResult> {
  const content = await getCanvasContent(threadId);

  if (!content || content.length === 0) {
    return {
      toolCallId,
      result: "The canvas is empty.",
      success: true,
    };
  }

  // Format content for AI readability
  const formatted = formatCanvasForAI(content);

  return {
    toolCallId,
    result: formatted,
    success: true,
  };
}

/**
 * Add blocks to canvas
 */
async function executeAddToCanvas(
  toolCallId: string,
  threadId: string,
  args: { blocks: SimpleBlock[] }
): Promise<ToolResult> {
  if (!args.blocks || args.blocks.length === 0) {
    return {
      toolCallId,
      result: "No blocks provided to add.",
      success: false,
    };
  }

  await appendCanvasBlocks(threadId, args.blocks);

  return {
    toolCallId,
    result: `Added ${args.blocks.length} block(s) to the canvas.`,
    success: true,
  };
}

/**
 * Update a block
 */
async function executeUpdateBlock(
  toolCallId: string,
  threadId: string,
  args: { blockId: string; content?: string; props?: Record<string, unknown> }
): Promise<ToolResult> {
  if (!args.blockId) {
    return {
      toolCallId,
      result: "No blockId provided.",
      success: false,
    };
  }

  const content = await getCanvasContent(threadId);
  if (!content || content.length === 0) {
    return {
      toolCallId,
      result: "Canvas is empty, no blocks to update.",
      success: false,
    };
  }

  // Find and update the block
  let found = false;
  const updatedContent = content.map((block) => {
    const b = block as Record<string, unknown>;
    if (b.id === args.blockId) {
      found = true;
      return {
        ...b,
        ...(args.content !== undefined && {
          content: [{ type: "text", text: args.content, styles: {} }],
        }),
        ...(args.props !== undefined && {
          props: { ...(b.props as Record<string, unknown>), ...args.props },
        }),
      };
    }
    return block;
  });

  if (!found) {
    return {
      toolCallId,
      result: `Block with ID "${args.blockId}" not found.`,
      success: false,
    };
  }

  await saveCanvasContent(threadId, updatedContent);

  return {
    toolCallId,
    result: `Updated block "${args.blockId}".`,
    success: true,
  };
}

/**
 * Delete a block
 */
async function executeDeleteBlock(
  toolCallId: string,
  threadId: string,
  args: { blockId: string }
): Promise<ToolResult> {
  if (!args.blockId) {
    return {
      toolCallId,
      result: "No blockId provided.",
      success: false,
    };
  }

  const content = await getCanvasContent(threadId);
  if (!content || content.length === 0) {
    return {
      toolCallId,
      result: "Canvas is empty, no blocks to delete.",
      success: false,
    };
  }

  const originalLength = content.length;
  const updatedContent = content.filter((block) => {
    const b = block as Record<string, unknown>;
    return b.id !== args.blockId;
  });

  if (updatedContent.length === originalLength) {
    return {
      toolCallId,
      result: `Block with ID "${args.blockId}" not found.`,
      success: false,
    };
  }

  // Ensure at least one empty paragraph if all blocks deleted
  if (updatedContent.length === 0) {
    updatedContent.push({
      id: `block-${Date.now()}`,
      type: "paragraph",
      props: {},
      content: [],
      children: [],
    });
  }

  await saveCanvasContent(threadId, updatedContent);

  return {
    toolCallId,
    result: `Deleted block "${args.blockId}".`,
    success: true,
  };
}

/**
 * Format canvas content for AI readability
 */
function formatCanvasForAI(content: CanvasContent): string {
  const lines: string[] = ["Current canvas content:", ""];

  for (const block of content) {
    const b = block as Record<string, unknown>;
    const id = b.id as string;
    const type = b.type as string;
    const props = (b.props || {}) as Record<string, unknown>;

    // Extract text content
    let text = "";
    const blockContent = b.content as unknown;
    if (Array.isArray(blockContent)) {
      text = blockContent
        .map((item: Record<string, unknown>) => item.text || "")
        .join("");
    }

    // Format based on type
    let prefix = "";
    let suffix = "";

    switch (type) {
      case "heading":
        prefix = `[H${props.level || 1}] `;
        break;
      case "bulletListItem":
        prefix = "• ";
        break;
      case "numberedListItem":
        prefix = "1. ";
        break;
      case "checkListItem":
        prefix = props.checked ? "[x] " : "[ ] ";
        break;
      case "codeBlock":
        prefix = "```" + (props.language || "") + "\n";
        suffix = "\n```";
        break;
    }

    lines.push(`ID: ${id}`);
    lines.push(`${prefix}${text}${suffix}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================
// SYSTEM PROMPT FOR TOOL USE
// ============================================

export const CANVAS_TOOLS_SYSTEM_PROMPT = `
You have access to a canvas - a rich document that exists alongside this chat.
The canvas is for persistent, structured content that the user can reference and edit.

You have tools to interact with the canvas:

1. **read_canvas** - See what's currently in the canvas. ALWAYS use this before updating existing content.
2. **add_to_canvas** - Add new blocks (paragraphs, headings, checklists, bullet points, etc.)
3. **update_block** - Update an existing block by ID. Use this to edit text or mark checkboxes as completed.
4. **delete_block** - Remove a block by ID.

## When to use the canvas:

- Creating todo lists, checklists, or task lists
- Writing notes, summaries, or documentation
- Any structured content the user wants to keep

## Important guidelines:

- ALWAYS call read_canvas first if you need to modify existing content
- Use block IDs from read_canvas when calling update_block or delete_block
- To mark a checkbox complete, use update_block with props: {checked: true}
- The canvas persists - content stays until explicitly changed

## Block types:

- paragraph: Regular text
- heading: Section header (props: {level: 1|2|3})
- bulletListItem: Bullet point
- numberedListItem: Numbered list item
- checkListItem: Checkbox (props: {checked: boolean})
- codeBlock: Code (props: {language: string})
`.trim();
