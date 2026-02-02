/**
 * Canvas Types for AI-collaborative document editing
 *
 * These types define the structure for canvas documents and blocks,
 * enabling AI to read, write, and modify documents programmatically.
 */

// Block types supported by the canvas
export type CanvasBlockType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "table"
  | "image"
  | "codeBlock"
  // Future custom blocks
  | "database"
  | "kanban"
  | "chart";

// Heading levels
export type HeadingLevel = 1 | 2 | 3;

// Text content styling
export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  textColor?: string;
  backgroundColor?: string;
}

// Inline content (text with optional styling and links)
export interface InlineContent {
  type: "text" | "link";
  text: string;
  styles?: TextStyle;
  href?: string; // For links
}

// Props for different block types
export interface ParagraphProps {
  textAlignment?: "left" | "center" | "right" | "justify";
}

export interface HeadingProps {
  level: HeadingLevel;
  textAlignment?: "left" | "center" | "right" | "justify";
}

export interface CheckListItemProps {
  checked: boolean;
  textAlignment?: "left" | "center" | "right" | "justify";
}

export interface CodeBlockProps {
  language?: string;
}

export interface ImageProps {
  url?: string;
  caption?: string;
  width?: number;
}

// Table structure
export interface TableCell {
  content: InlineContent[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableProps {
  rows: TableRow[];
}

// Database block (Notion-like)
export interface DatabaseColumn {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "time" | "select" | "multiselect" | "status";
  options?: string[]; // For select type
}

export interface DatabaseRow {
  id: string;
  cells: Record<string, unknown>;
}

export interface DatabaseProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
}

// Kanban block
export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanProps {
  columns: KanbanColumn[];
}

// Chart block
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartProps {
  type: "bar" | "line" | "pie";
  title?: string;
  data: ChartDataPoint[];
}

// Union type for all block props
export type BlockProps =
  | ParagraphProps
  | HeadingProps
  | CheckListItemProps
  | CodeBlockProps
  | ImageProps
  | TableProps
  | DatabaseProps
  | KanbanProps
  | ChartProps
  | Record<string, unknown>;

/**
 * A canvas block represents a single content unit in the document
 */
export interface CanvasBlock {
  id: string;
  type: CanvasBlockType;
  content: InlineContent[] | string; // Text content or raw string
  props: BlockProps;
  children?: CanvasBlock[]; // Nested blocks (e.g., list items)
}

/**
 * A canvas document represents the entire editable content
 */
export interface CanvasDocument {
  threadId: string;
  blocks: CanvasBlock[];
  version: number;
}

/**
 * Operation types for modifying the canvas
 */
export type CanvasOperationType = "insert" | "update" | "delete" | "move";

/**
 * A single operation to apply to the canvas
 */
export interface CanvasOperation {
  type: CanvasOperationType;
  blockId?: string; // Required for update, delete, move
  block?: Partial<CanvasBlock>; // Block data for insert/update
  position?: number; // Target position for insert/move
  afterBlockId?: string; // Insert after this block (alternative to position)
}

/**
 * Result of applying operations
 */
export interface CanvasOperationResult {
  success: boolean;
  blockId?: string; // ID of created/modified block
  error?: string;
}

/**
 * Simplified block creation helpers for AI
 */
export interface SimpleBlock {
  type: CanvasBlockType;
  content: string | InlineContent[];
  props?: BlockProps;
}

/**
 * Convert simple text to inline content
 */
export function textToInlineContent(text: string): InlineContent[] {
  return [{ type: "text", text }];
}

/**
 * Create a simple paragraph block
 */
export function createParagraph(text: string): SimpleBlock {
  return {
    type: "paragraph",
    content: textToInlineContent(text),
  };
}

/**
 * Create a heading block
 */
export function createHeading(text: string, level: HeadingLevel = 1): SimpleBlock {
  return {
    type: "heading",
    content: textToInlineContent(text),
    props: { level },
  };
}

/**
 * Create a checklist item
 */
export function createCheckListItem(text: string, checked = false): SimpleBlock {
  return {
    type: "checkListItem",
    content: textToInlineContent(text),
    props: { checked },
  };
}
