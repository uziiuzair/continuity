/**
 * AI Canvas API Interface
 *
 * This interface defines how AI can interact with the canvas document.
 * It provides read/write operations that abstract away the underlying
 * editor implementation (BlockNote).
 */

import {
  CanvasBlock,
  CanvasDocument,
  CanvasOperation,
  CanvasOperationResult,
  CanvasBlockType,
  SimpleBlock,
} from "./types";

/**
 * The AI Canvas API provides programmatic access to the canvas document.
 * This interface is implemented by the BlockNote adapter.
 */
export interface AICanvasAPI {
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get the entire document structure
   */
  readDocument(): CanvasDocument;

  /**
   * Get a specific block by ID
   */
  readBlock(blockId: string): CanvasBlock | null;

  /**
   * Find all blocks of a specific type
   */
  findBlocks(type: CanvasBlockType): CanvasBlock[];

  /**
   * Get document as plain text (for AI context/summarization)
   */
  getDocumentAsText(): string;

  /**
   * Get document as JSON string (for AI parsing)
   */
  getDocumentAsJSON(): string;

  /**
   * Get the current block count
   */
  getBlockCount(): number;

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Insert a new block at a specific position or after a block
   * Returns the ID of the inserted block
   */
  insertBlock(block: SimpleBlock, options?: InsertOptions): string;

  /**
   * Insert multiple blocks at once
   * Returns the IDs of the inserted blocks
   */
  insertBlocks(blocks: SimpleBlock[], options?: InsertOptions): string[];

  /**
   * Update an existing block's content or properties
   */
  updateBlock(blockId: string, updates: Partial<CanvasBlock>): boolean;

  /**
   * Delete a block by ID
   */
  deleteBlock(blockId: string): boolean;

  /**
   * Move a block to a new position
   */
  moveBlock(blockId: string, options: MoveOptions): boolean;

  /**
   * Replace all content in the document
   */
  replaceDocument(blocks: SimpleBlock[]): void;

  /**
   * Clear all content from the document
   */
  clearDocument(): void;

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Apply multiple operations in sequence
   * Returns results for each operation
   */
  applyOperations(operations: CanvasOperation[]): CanvasOperationResult[];

  // ============================================
  // UTILITY OPERATIONS
  // ============================================

  /**
   * Check if the editor is ready for operations
   */
  isReady(): boolean;

  /**
   * Focus the editor at a specific block
   */
  focusBlock(blockId: string): void;

  /**
   * Get the currently focused/selected block ID
   */
  getSelectedBlockId(): string | null;
}

/**
 * Options for inserting blocks
 */
export interface InsertOptions {
  /** Insert at this numeric position (0 = beginning) */
  position?: number;
  /** Insert after this block ID */
  afterBlockId?: string;
  /** Insert before this block ID */
  beforeBlockId?: string;
}

/**
 * Options for moving blocks
 */
export interface MoveOptions {
  /** Move to this numeric position */
  position?: number;
  /** Move after this block ID */
  afterBlockId?: string;
  /** Move before this block ID */
  beforeBlockId?: string;
}

/**
 * Factory function type for creating the AI Canvas API
 */
export type CreateAICanvasAPI = (editor: unknown, threadId: string) => AICanvasAPI;
