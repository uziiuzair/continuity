import { getDb, isTauriContext } from "../db";
import { CanvasContent } from "@/types";
import { SimpleBlock } from "@/lib/canvas";

interface CanvasRow {
  canvas_content: string | null;
}

// Generate a unique block ID
function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Convert SimpleBlock to BlockNote format
function simpleBlockToBlockNote(block: SimpleBlock): Record<string, unknown> {
  return {
    id: generateBlockId(),
    type: block.type,
    props: block.props || {},
    content: typeof block.content === "string"
      ? [{ type: "text", text: block.content, styles: {} }]
      : block.content,
    children: [],
  };
}

export async function getCanvasContent(
  threadId: string
): Promise<CanvasContent | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<CanvasRow[]>(
    "SELECT canvas_content FROM threads WHERE id = $1",
    [threadId]
  );

  if (rows.length === 0 || !rows[0].canvas_content) {
    return null;
  }

  try {
    return JSON.parse(rows[0].canvas_content) as CanvasContent;
  } catch {
    console.error("Failed to parse canvas content for thread:", threadId);
    return null;
  }
}

export async function saveCanvasContent(
  threadId: string,
  content: CanvasContent
): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const contentJson = JSON.stringify(content);

  await db.execute(
    "UPDATE threads SET canvas_content = $1, updated_at = $2 WHERE id = $3",
    [contentJson, now, threadId]
  );
}

/**
 * Append blocks to the canvas content in the database.
 * This works even when the canvas UI isn't visible.
 * Returns the updated content so callers can refresh UI state.
 */
export async function appendCanvasBlocks(
  threadId: string,
  blocks: SimpleBlock[]
): Promise<CanvasContent> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Get existing content
  const existingContent = await getCanvasContent(threadId);

  // Convert SimpleBlocks to BlockNote format
  const newBlocks = blocks.map(simpleBlockToBlockNote);

  // Merge with existing content
  let updatedContent: CanvasContent;
  if (existingContent && Array.isArray(existingContent) && existingContent.length > 0) {
    // Check if the only block is an empty paragraph (default state)
    const isDefaultEmpty =
      existingContent.length === 1 &&
      (existingContent[0] as Record<string, unknown>)?.type === "paragraph" &&
      isEmptyContent((existingContent[0] as Record<string, unknown>)?.content);

    if (isDefaultEmpty) {
      // Replace the empty paragraph with new content
      updatedContent = newBlocks;
    } else {
      // Append to existing content
      updatedContent = [...existingContent, ...newBlocks];
    }
  } else {
    updatedContent = newBlocks;
  }

  // Save to database
  await saveCanvasContent(threadId, updatedContent);

  return updatedContent;
}

// Check if content is empty (empty array or array with empty text)
function isEmptyContent(content: unknown): boolean {
  if (!content) return true;
  if (!Array.isArray(content)) return false;
  if (content.length === 0) return true;
  // Check if it's just empty text nodes
  return content.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const node = item as Record<string, unknown>;
    return node.type === "text" && (!node.text || node.text === "");
  });
}
