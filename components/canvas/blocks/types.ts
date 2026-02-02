/**
 * Custom Block Editor Types
 */

// Inline content for rich text (simplified from BlockNote)
export interface InlineContent {
  type: "text" | "link";
  text: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
  href?: string;
}

// Generic block structure matching existing CanvasBlock
export interface EditorBlock {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | string;
  children?: EditorBlock[];
}

// Props passed to individual block components
export interface BlockComponentProps {
  block: EditorBlock;
  onUpdate: (id: string, updates: Partial<EditorBlock>) => void;
  onDelete: (id: string) => void;
  onAddAfter: (id: string) => void;
  onFocusPrevious?: (id: string) => void;
  onFocusNext?: (id: string) => void;
  isFocused?: boolean;
  onSlashMenu?: (blockId: string, position: { x: number; y: number }) => void;
  onSlashMenuClose?: () => void;
  onSlashMenuFilter?: (filter: string) => void;
}

// Helper to generate unique IDs
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to extract plain text from inline content
export function getTextFromContent(content?: InlineContent[] | string): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content.map((c) => c.text).join("");
}

// Helper to create inline content from plain text
export function textToContent(text: string): InlineContent[] {
  if (!text) return [];
  return [{ type: "text", text }];
}

// Create an empty paragraph block
export function createEmptyParagraph(): EditorBlock {
  return {
    id: generateBlockId(),
    type: "paragraph",
    content: [],
    props: {},
  };
}

// Create a heading block
export function createHeading(level: 1 | 2 | 3 = 1): EditorBlock {
  return {
    id: generateBlockId(),
    type: "heading",
    content: [],
    props: { level },
  };
}

// Create a list item block
export function createListItem(
  listType: "bullet" | "numbered" | "todo" = "bullet"
): EditorBlock {
  return {
    id: generateBlockId(),
    type: "listItem",
    content: [],
    props: { listType, checked: false },
  };
}

// Create a database block
export function createDatabaseBlock(): EditorBlock {
  return {
    id: generateBlockId(),
    type: "database",
    content: [],
    props: {
      databaseId: null, // Will be set when database is created/loaded
      viewType: "table",
    },
  };
}

// Create a code block
export function createCodeBlock(language: string = "plaintext"): EditorBlock {
  return {
    id: generateBlockId(),
    type: "code",
    content: "",
    props: { language },
  };
}
