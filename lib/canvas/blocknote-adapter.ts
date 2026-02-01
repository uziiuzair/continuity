/**
 * BlockNote Adapter
 *
 * Implements the AICanvasAPI interface using a BlockNote editor instance.
 * Translates between our canvas types and BlockNote's block format.
 */

import { BlockNoteEditor, Block, PartialBlock } from "@blocknote/core";
import { AICanvasAPI, InsertOptions, MoveOptions } from "./ai-canvas-api";
import {
  CanvasBlock,
  CanvasDocument,
  CanvasOperation,
  CanvasOperationResult,
  CanvasBlockType,
  SimpleBlock,
  InlineContent,
} from "./types";

/**
 * Creates an AI Canvas API implementation backed by a BlockNote editor
 */
export function createBlockNoteAdapter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: BlockNoteEditor<any, any, any>,
  threadId: string,
): AICanvasAPI {
  /**
   * Convert BlockNote block to our CanvasBlock format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function blockNoteToCanvasBlock(block: Block<any, any, any>): CanvasBlock {
    // Extract text content from BlockNote's content array
    let content: InlineContent[] | string = "";

    // BlockNote's content can be an array of inline content or undefined
    const blockContent = block.content as unknown;

    if (Array.isArray(blockContent)) {
      content = blockContent.map((item: Record<string, unknown>) => {
        if (typeof item === "string") {
          return { type: "text" as const, text: item };
        }
        if (item.type === "text") {
          return {
            type: "text" as const,
            text: (item.text as string) || "",
            styles: item.styles as Record<string, unknown> | undefined,
          };
        }
        if (item.type === "link") {
          const linkContent = item.content as
            | Array<{ text?: string }>
            | undefined;
          return {
            type: "link" as const,
            text: linkContent?.[0]?.text || "",
            href: item.href as string | undefined,
          };
        }
        return { type: "text" as const, text: "" };
      });
    } else if (typeof blockContent === "string") {
      content = blockContent;
    }

    return {
      id: block.id,
      type: block.type as CanvasBlockType,
      content,
      props: (block.props || {}) as Record<string, unknown>,
      children: block.children?.map(blockNoteToCanvasBlock),
    };
  }

  /**
   * Convert our SimpleBlock to BlockNote's PartialBlock format
   */
  function simpleBlockToBlockNote(block: SimpleBlock): PartialBlock {
    // Convert content to BlockNote format
    let content: PartialBlock["content"];

    if (typeof block.content === "string") {
      content = [{ type: "text", text: block.content, styles: {} }];
    } else if (Array.isArray(block.content)) {
      content = block.content.map((item) => {
        if (item.type === "link") {
          return {
            type: "link" as const,
            href: item.href || "",
            content: [{ type: "text" as const, text: item.text, styles: {} }],
          };
        }
        return {
          type: "text" as const,
          text: item.text,
          styles: item.styles || {},
        };
      });
    }

    return {
      type: block.type,
      content,
      props: block.props,
    } as PartialBlock;
  }

  /**
   * Get block at a specific index
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getBlockAtIndex(index: number): Block<any, any, any> | null {
    const blocks = editor.document;
    if (index >= 0 && index < blocks.length) {
      return blocks[index];
    }
    return null;
  }

  /**
   * Find block index by ID
   */
  function findBlockIndex(blockId: string): number {
    return editor.document.findIndex((b) => b.id === blockId);
  }

  /**
   * Extract plain text from a block
   */
  function blockToText(block: Block): string {
    if (!block.content) return "";

    if (Array.isArray(block.content)) {
      return block.content
        .map((item) => {
          if (typeof item === "string") return item;
          if (item.type === "text") return item.text || "";
          if (item.type === "link") {
            const linkContent = item.content;
            if (Array.isArray(linkContent)) {
              return linkContent.map((c) => c.text || "").join("");
            }
          }
          return "";
        })
        .join("");
    }

    return "";
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  function readDocument(): CanvasDocument {
    const blocks = editor.document.map(blockNoteToCanvasBlock);
    return {
      threadId,
      blocks,
      version: Date.now(), // Simple versioning
    };
  }

  function readBlock(blockId: string): CanvasBlock | null {
    const block = editor.getBlock(blockId);
    if (!block) return null;
    return blockNoteToCanvasBlock(block);
  }

  function findBlocks(type: CanvasBlockType): CanvasBlock[] {
    return editor.document
      .filter((block) => block.type === type)
      .map(blockNoteToCanvasBlock);
  }

  function getDocumentAsText(): string {
    return editor.document
      .map((block) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = blockToText(block as any);
        // Add prefix based on block type
        switch (block.type) {
          case "heading":
            const level = (block.props as { level?: number })?.level || 1;
            return "#".repeat(level) + " " + text;
          case "bulletListItem":
            return "• " + text;
          case "numberedListItem":
            return "1. " + text;
          case "checkListItem":
            const checked = (block.props as { checked?: boolean })?.checked;
            return (checked ? "[x] " : "[ ] ") + text;
          default:
            return text;
        }
      })
      .filter((text) => text.trim().length > 0)
      .join("\n");
  }

  function getDocumentAsJSON(): string {
    return JSON.stringify(readDocument(), null, 2);
  }

  function getBlockCount(): number {
    return editor.document.length;
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  function insertBlock(block: SimpleBlock, options?: InsertOptions): string {
    const blockNoteBlock = simpleBlockToBlockNote(block);

    let referenceBlock: Block | null = null;
    let placement: "before" | "after" = "after";

    if (options?.afterBlockId) {
      referenceBlock = editor.getBlock(options.afterBlockId) as Block;
      placement = "after";
    } else if (options?.beforeBlockId) {
      referenceBlock = editor.getBlock(options.beforeBlockId) as Block;
      placement = "before";
    } else if (options?.position !== undefined) {
      // Get block at position
      if (options.position === 0) {
        referenceBlock = getBlockAtIndex(0) as Block;
        placement = "before";
      } else {
        referenceBlock = getBlockAtIndex(options.position - 1) as Block;
        placement = "after";
      }
    }

    if (referenceBlock) {
      editor.insertBlocks([blockNoteBlock], referenceBlock, placement);
    } else {
      // Insert at the end
      const lastBlock = editor.document[editor.document.length - 1];
      if (lastBlock) {
        editor.insertBlocks([blockNoteBlock], lastBlock, "after");
      } else {
        // Document is empty, just insert
        editor.insertBlocks(
          [blockNoteBlock],
          undefined as unknown as Block,
          "after",
        );
      }
    }

    // Return the ID of the inserted block (last block in document if appended)
    const insertedIndex = options?.position ?? editor.document.length - 1;
    const insertedBlock = editor.document[insertedIndex];
    return insertedBlock?.id || "";
  }

  function insertBlocks(
    blocks: SimpleBlock[],
    options?: InsertOptions,
  ): string[] {
    const blockNoteBlocks = blocks.map(simpleBlockToBlockNote);
    const ids: string[] = [];

    let referenceBlock: Block | null = null;
    let placement: "before" | "after" = "after";

    if (options?.afterBlockId) {
      referenceBlock = editor.getBlock(options.afterBlockId) as Block;
      placement = "after";
    } else if (options?.beforeBlockId) {
      referenceBlock = editor.getBlock(options.beforeBlockId) as Block;
      placement = "before";
    } else if (options?.position !== undefined) {
      if (options.position === 0) {
        referenceBlock = getBlockAtIndex(0) as Block;
        placement = "before";
      } else {
        referenceBlock = getBlockAtIndex(options.position - 1) as Block;
        placement = "after";
      }
    }

    if (referenceBlock) {
      editor.insertBlocks(blockNoteBlocks, referenceBlock, placement);
    } else {
      const lastBlock = editor.document[editor.document.length - 1];
      if (lastBlock) {
        editor.insertBlocks(blockNoteBlocks, lastBlock, "after");
      } else {
        editor.insertBlocks(
          blockNoteBlocks,
          undefined as unknown as Block,
          "after",
        );
      }
    }

    // Collect IDs of inserted blocks
    const startIndex =
      options?.position ?? editor.document.length - blocks.length;
    for (let i = 0; i < blocks.length; i++) {
      const block = editor.document[startIndex + i];
      if (block) {
        ids.push(block.id);
      }
    }

    return ids;
  }

  function updateBlock(
    blockId: string,
    updates: Partial<CanvasBlock>,
  ): boolean {
    const existingBlock = editor.getBlock(blockId);
    if (!existingBlock) return false;

    const updatePayload: Partial<PartialBlock> = {};

    if (updates.content !== undefined) {
      if (typeof updates.content === "string") {
        updatePayload.content = [
          { type: "text", text: updates.content, styles: {} },
        ];
      } else if (Array.isArray(updates.content)) {
        updatePayload.content = updates.content.map((item) => ({
          type: "text" as const,
          text: item.text,
          styles: item.styles || {},
        }));
      }
    }

    if (updates.props !== undefined) {
      updatePayload.props = updates.props;
    }

    if (updates.type !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatePayload.type = updates.type as any;
    }

    editor.updateBlock(blockId, updatePayload);
    return true;
  }

  function deleteBlock(blockId: string): boolean {
    const block = editor.getBlock(blockId);
    if (!block) return false;

    editor.removeBlocks([block]);
    return true;
  }

  function moveBlock(blockId: string, options: MoveOptions): boolean {
    const block = editor.getBlock(blockId);
    if (!block) return false;

    let referenceBlock: Block | null = null;
    let placement: "before" | "after" = "after";

    if (options.afterBlockId) {
      referenceBlock = editor.getBlock(options.afterBlockId) as Block;
      placement = "after";
    } else if (options.beforeBlockId) {
      referenceBlock = editor.getBlock(options.beforeBlockId) as Block;
      placement = "before";
    } else if (options.position !== undefined) {
      if (options.position === 0) {
        referenceBlock = getBlockAtIndex(0) as Block;
        placement = "before";
      } else {
        referenceBlock = getBlockAtIndex(options.position - 1) as Block;
        placement = "after";
      }
    }

    if (!referenceBlock) return false;

    // Convert to CanvasBlock and back to PartialBlock to ensure type compatibility
    const canvasBlock = blockNoteToCanvasBlock(block);
    const simpleBlock: SimpleBlock = {
      type: canvasBlock.type,
      content: canvasBlock.content,
      props: canvasBlock.props,
    };
    const partialBlock = simpleBlockToBlockNote(simpleBlock);

    // Remove then insert to move
    editor.removeBlocks([block]);
    editor.insertBlocks([partialBlock], referenceBlock, placement);
    return true;
  }

  function replaceDocument(blocks: SimpleBlock[]): void {
    const blockNoteBlocks = blocks.map(simpleBlockToBlockNote);
    editor.replaceBlocks(editor.document, blockNoteBlocks as Block[]);
  }

  function clearDocument(): void {
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: [] } as Block,
    ]);
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  function applyOperations(
    operations: CanvasOperation[],
  ): CanvasOperationResult[] {
    const results: CanvasOperationResult[] = [];

    for (const op of operations) {
      try {
        switch (op.type) {
          case "insert": {
            if (!op.block) {
              results.push({
                success: false,
                error: "No block data for insert",
              });
              break;
            }
            const simpleBlock: SimpleBlock = {
              type: op.block.type || "paragraph",
              content: op.block.content || "",
              props: op.block.props,
            };
            const insertOptions: InsertOptions = {};
            if (op.position !== undefined) insertOptions.position = op.position;
            if (op.afterBlockId) insertOptions.afterBlockId = op.afterBlockId;

            const id = insertBlock(simpleBlock, insertOptions);
            results.push({ success: true, blockId: id });
            break;
          }

          case "update": {
            if (!op.blockId) {
              results.push({ success: false, error: "No blockId for update" });
              break;
            }
            const updated = updateBlock(op.blockId, op.block || {});
            results.push({ success: updated, blockId: op.blockId });
            break;
          }

          case "delete": {
            if (!op.blockId) {
              results.push({ success: false, error: "No blockId for delete" });
              break;
            }
            const deleted = deleteBlock(op.blockId);
            results.push({ success: deleted, blockId: op.blockId });
            break;
          }

          case "move": {
            if (!op.blockId) {
              results.push({ success: false, error: "No blockId for move" });
              break;
            }
            const moveOptions: MoveOptions = {};
            if (op.position !== undefined) moveOptions.position = op.position;
            if (op.afterBlockId) moveOptions.afterBlockId = op.afterBlockId;

            const moved = moveBlock(op.blockId, moveOptions);
            results.push({ success: moved, blockId: op.blockId });
            break;
          }

          default:
            results.push({
              success: false,
              error: `Unknown operation type: ${op.type}`,
            });
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  function isReady(): boolean {
    return editor !== null && editor !== undefined;
  }

  function focusBlock(blockId: string): void {
    const block = editor.getBlock(blockId);
    if (block) {
      editor.setTextCursorPosition(block, "end");
    }
  }

  function getSelectedBlockId(): string | null {
    const selection = editor.getTextCursorPosition();
    return selection?.block?.id || null;
  }

  // Return the API implementation
  return {
    // Read
    readDocument,
    readBlock,
    findBlocks,
    getDocumentAsText,
    getDocumentAsJSON,
    getBlockCount,

    // Write
    insertBlock,
    insertBlocks,
    updateBlock,
    deleteBlock,
    moveBlock,
    replaceDocument,
    clearDocument,

    // Batch
    applyOperations,

    // Utility
    isReady,
    focusBlock,
    getSelectedBlockId,
  };
}
