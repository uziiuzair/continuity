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
