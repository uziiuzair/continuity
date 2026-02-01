/**
 * Canvas Module
 *
 * Exports the AI Canvas API and related types for programmatic
 * document manipulation.
 */

// Types
export * from "./types";

// API interface
export type { AICanvasAPI, InsertOptions, MoveOptions, CreateAICanvasAPI } from "./ai-canvas-api";

// BlockNote adapter
export { createBlockNoteAdapter } from "./blocknote-adapter";
