/**
 * Canvas Operations Parser
 *
 * Parses AI responses for canvas block definitions and operations.
 * AI can include canvas blocks using a special markdown code fence:
 *
 * ```canvas-block
 * {
 *   "type": "checkListItem",
 *   "content": "Task text here",
 *   "props": { "checked": false }
 * }
 * ```
 *
 * Multiple blocks can be defined:
 * ```canvas-blocks
 * [
 *   { "type": "heading", "content": "My List", "props": { "level": 2 } },
 *   { "type": "checkListItem", "content": "Item 1", "props": { "checked": false } },
 *   { "type": "checkListItem", "content": "Item 2", "props": { "checked": false } }
 * ]
 * ```
 */

import { AICanvasBlock, ParsedCanvasOperations } from "./types";
import { SimpleBlock } from "@/lib/canvas";

// Regex to match canvas-block code fences (single block)
const CANVAS_BLOCK_REGEX = /```canvas-block\s*\n([\s\S]*?)\n```/g;

// Regex to match canvas-blocks code fences (multiple blocks)
const CANVAS_BLOCKS_REGEX = /```canvas-blocks\s*\n([\s\S]*?)\n```/g;

/**
 * Parse AI response text for canvas block definitions
 */
export function parseCanvasBlocks(aiResponse: string): ParsedCanvasOperations {
  const blocks: AICanvasBlock[] = [];
  let textContent = aiResponse;

  // Parse single block definitions
  let match;
  while ((match = CANVAS_BLOCK_REGEX.exec(aiResponse)) !== null) {
    try {
      const blockJson = match[1].trim();
      const block = JSON.parse(blockJson) as AICanvasBlock;
      if (isValidCanvasBlock(block)) {
        blocks.push(block);
      }
      // Remove from text content
      textContent = textContent.replace(match[0], "");
    } catch (e) {
      console.error("Failed to parse canvas-block:", e);
    }
  }

  // Reset regex lastIndex for reuse
  CANVAS_BLOCK_REGEX.lastIndex = 0;

  // Parse multiple block definitions
  while ((match = CANVAS_BLOCKS_REGEX.exec(aiResponse)) !== null) {
    try {
      const blocksJson = match[1].trim();
      const parsedBlocks = JSON.parse(blocksJson) as AICanvasBlock[];
      if (Array.isArray(parsedBlocks)) {
        for (const block of parsedBlocks) {
          if (isValidCanvasBlock(block)) {
            blocks.push(block);
          }
        }
      }
      // Remove from text content
      textContent = textContent.replace(match[0], "");
    } catch (e) {
      console.error("Failed to parse canvas-blocks:", e);
    }
  }

  // Reset regex lastIndex for reuse
  CANVAS_BLOCKS_REGEX.lastIndex = 0;

  // Clean up text content (remove extra whitespace from removals)
  textContent = textContent.replace(/\n{3,}/g, "\n\n").trim();

  return {
    textContent,
    blocks,
    hasCanvasContent: blocks.length > 0,
  };
}

/**
 * Validate that a parsed object is a valid canvas block
 */
function isValidCanvasBlock(block: unknown): block is AICanvasBlock {
  if (!block || typeof block !== "object") return false;

  const b = block as Record<string, unknown>;

  // Must have type
  if (typeof b.type !== "string") return false;

  // Type must be valid
  const validTypes = [
    "paragraph",
    "heading",
    "bulletListItem",
    "numberedListItem",
    "checkListItem",
    "codeBlock",
    "table",
    "image",
  ];
  if (!validTypes.includes(b.type)) return false;

  // Must have content (string)
  if (typeof b.content !== "string") return false;

  return true;
}

/**
 * Convert AI canvas blocks to SimpleBlocks for the canvas API
 */
export function aiBlocksToSimpleBlocks(aiBlocks: AICanvasBlock[]): SimpleBlock[] {
  return aiBlocks.map((block) => ({
    type: block.type,
    content: block.content,
    props: block.props || {},
  }));
}

/**
 * System prompt addition for AI to understand canvas block format
 */
export const CANVAS_SYSTEM_PROMPT = `
You have access to the user's canvas - a rich document editor that appears alongside this chat.
Use it to create persistent, structured content that the user can reference, edit, and keep.

## When to Use the Canvas

ALWAYS use canvas blocks when creating:
- Todo lists, checklists, or task lists
- Notes, summaries, or documentation
- Bullet points or numbered lists
- Action items or plans
- Any structured content the user would want to keep

The canvas is for content that should PERSIST. Chat is for discussion and explanation.
When in doubt, put structured content in the canvas.

## How to Create Canvas Content

To add blocks to the canvas, use this format:

\`\`\`canvas-blocks
[
  { "type": "heading", "content": "Section Title", "props": { "level": 2 } },
  { "type": "paragraph", "content": "Some paragraph text..." },
  { "type": "checkListItem", "content": "A todo item", "props": { "checked": false } }
]
\`\`\`

## Available Block Types

- paragraph: Regular text. No special props.
- heading: Section header. Props: { "level": 1 | 2 | 3 }
- bulletListItem: Bullet point. No special props.
- numberedListItem: Numbered list item. No special props.
- checkListItem: Checkbox/todo item. Props: { "checked": boolean }
- codeBlock: Code snippet. Props: { "language": string }

## Examples

User: "Help me plan my week"
→ Create checkListItem blocks for tasks, with a heading

User: "What are the key points of X?"
→ Create bulletListItem blocks with a heading

User: "I need to remember these steps"
→ Create numberedListItem or checkListItem blocks

User: "Summarize this for me"
→ Create paragraph blocks with a heading, add to canvas

Always explain briefly what you're adding, then include the canvas-blocks.
`.trim();

/**
 * Check if the user's message implies they want canvas content
 */
export function shouldSuggestCanvasContent(userMessage: string): boolean {
  const canvasKeywords = [
    "add to canvas",
    "put in canvas",
    "create a list",
    "make a list",
    "create a todo",
    "make a todo",
    "add a checklist",
    "create a checklist",
    "write in the canvas",
    "add notes",
    "create notes",
    "add to the document",
    "write a summary",
    "create a summary",
    "bullet points",
    "bullet list",
    "numbered list",
    "task list",
  ];

  const lowerMessage = userMessage.toLowerCase();
  return canvasKeywords.some((keyword) => lowerMessage.includes(keyword));
}
