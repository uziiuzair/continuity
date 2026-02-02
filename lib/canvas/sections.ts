/**
 * Canvas Section Helper Functions
 *
 * @deprecated This module is deprecated. The canvas no longer uses predefined sections.
 * The AI maintains internal state via work_state instead of rendering to canvas sections.
 *
 * These functions are preserved for backwards compatibility but should not be used
 * for new development.
 */

import { CanvasContent } from "@/types";
import { SimpleBlock } from "./types";

/**
 * @deprecated Sections are no longer used. Canvas is a clean slate for user content.
 */
export const SECTION_ORDER = [
  "Overview",
  "Current State",
  "Tasks",
  "Open Loops",
  "Blockers",
  "Decisions",
  "Notes",
  "Milestones",
] as const;

export type SectionTitle = (typeof SECTION_ORDER)[number];

/**
 * Bounds of a section within canvas content
 * @deprecated
 */
export interface SectionBounds {
  startIndex: number;
  endIndex: number;
}

/**
 * @deprecated
 */
function isH1WithTitle(block: unknown, title: string): boolean {
  if (!block || typeof block !== "object") return false;
  const b = block as Record<string, unknown>;

  if (b.type !== "heading") return false;

  const props = b.props as Record<string, unknown> | undefined;
  if (props?.level !== 1) return false;

  const content = b.content;
  if (!Array.isArray(content)) return false;

  const text = content
    .map((item: Record<string, unknown>) => item.text || "")
    .join("")
    .trim();

  return text.toLowerCase() === title.toLowerCase();
}

/**
 * @deprecated
 */
function getBlockText(block: unknown): string {
  if (!block || typeof block !== "object") return "";
  const b = block as Record<string, unknown>;
  const content = b.content;

  if (!Array.isArray(content)) return "";

  return content
    .map((item: Record<string, unknown>) => item.text || "")
    .join("")
    .trim();
}

/**
 * @deprecated
 */
function isH1Heading(block: unknown): boolean {
  if (!block || typeof block !== "object") return false;
  const b = block as Record<string, unknown>;

  if (b.type !== "heading") return false;

  const props = b.props as Record<string, unknown> | undefined;
  return props?.level === 1;
}

/**
 * @deprecated
 */
export function findSectionBounds(
  content: CanvasContent,
  sectionTitle: string
): SectionBounds | null {
  if (!content || !Array.isArray(content)) return null;

  let startIndex = -1;
  for (let i = 0; i < content.length; i++) {
    if (isH1WithTitle(content[i], sectionTitle)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) return null;

  let endIndex = content.length;
  for (let i = startIndex + 1; i < content.length; i++) {
    if (isH1Heading(content[i])) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}

/**
 * @deprecated
 */
export function getSectionBlocks(
  content: CanvasContent,
  sectionTitle: string
): unknown[] | null {
  const bounds = findSectionBounds(content, sectionTitle);
  if (!bounds) return null;
  return content.slice(bounds.startIndex + 1, bounds.endIndex);
}

/**
 * @deprecated
 */
export function getSectionHeadingId(
  content: CanvasContent,
  sectionTitle: string
): string | null {
  const bounds = findSectionBounds(content, sectionTitle);
  if (!bounds) return null;

  const block = content[bounds.startIndex] as Record<string, unknown>;
  return (block?.id as string) || null;
}

/**
 * @deprecated
 */
function findSectionInsertPosition(
  content: CanvasContent,
  sectionTitle: string
): number {
  const targetIndex = SECTION_ORDER.indexOf(sectionTitle as SectionTitle);
  if (targetIndex === -1) {
    return content.length;
  }

  for (let i = targetIndex + 1; i < SECTION_ORDER.length; i++) {
    const bounds = findSectionBounds(content, SECTION_ORDER[i]);
    if (bounds) {
      return bounds.startIndex;
    }
  }

  return content.length;
}

/**
 * @deprecated
 */
function createSectionHeading(title: string): Record<string, unknown> {
  return {
    id: `section-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    type: "heading",
    props: { level: 1 },
    content: [{ type: "text", text: title, styles: {} }],
    children: [],
  };
}

/**
 * @deprecated
 */
export function insertSection(
  content: CanvasContent,
  sectionTitle: string,
  initialBlocks: SimpleBlock[] = []
): CanvasContent {
  if (findSectionBounds(content, sectionTitle)) {
    return content;
  }

  const insertPosition = findSectionInsertPosition(content, sectionTitle);
  const headingBlock = createSectionHeading(sectionTitle);

  const formattedBlocks = initialBlocks.map((block) => ({
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: block.type,
    props: block.props || {},
    content:
      typeof block.content === "string"
        ? [{ type: "text", text: block.content, styles: {} }]
        : block.content,
    children: [],
  }));

  const newContent = [...content];
  newContent.splice(insertPosition, 0, headingBlock, ...formattedBlocks);

  return newContent;
}

/**
 * @deprecated
 */
export function appendToSection(
  content: CanvasContent,
  sectionTitle: string,
  blocks: SimpleBlock[]
): CanvasContent | null {
  const bounds = findSectionBounds(content, sectionTitle);
  if (!bounds) return null;

  const formattedBlocks = blocks.map((block) => ({
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: block.type,
    props: block.props || {},
    content:
      typeof block.content === "string"
        ? [{ type: "text", text: block.content, styles: {} }]
        : block.content,
    children: [],
  }));

  const newContent = [...content];
  newContent.splice(bounds.endIndex, 0, ...formattedBlocks);

  return newContent;
}

/**
 * @deprecated
 */
export function replaceSectionContent(
  content: CanvasContent,
  sectionTitle: string,
  blocks: SimpleBlock[]
): CanvasContent | null {
  const bounds = findSectionBounds(content, sectionTitle);
  if (!bounds) return null;

  const formattedBlocks = blocks.map((block) => ({
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type: block.type,
    props: block.props || {},
    content:
      typeof block.content === "string"
        ? [{ type: "text", text: block.content, styles: {} }]
        : block.content,
    children: [],
  }));

  const newContent = [...content];
  const deleteCount = bounds.endIndex - bounds.startIndex - 1;
  newContent.splice(bounds.startIndex + 1, deleteCount, ...formattedBlocks);

  return newContent;
}

/**
 * @deprecated
 */
export function getSectionSummary(
  content: CanvasContent
): { title: string; blockCount: number }[] {
  if (!content || !Array.isArray(content)) return [];

  const sections: { title: string; startIndex: number }[] = [];

  for (let i = 0; i < content.length; i++) {
    if (isH1Heading(content[i])) {
      const title = getBlockText(content[i]);
      sections.push({ title, startIndex: i });
    }
  }

  return sections.map((section, index) => {
    const nextStart =
      index < sections.length - 1
        ? sections[index + 1].startIndex
        : content.length;
    return {
      title: section.title,
      blockCount: nextStart - section.startIndex - 1,
    };
  });
}

/**
 * @deprecated
 */
export function ensureAllSections(content: CanvasContent): CanvasContent {
  let updatedContent = content || [];

  for (const sectionTitle of SECTION_ORDER) {
    if (!findSectionBounds(updatedContent, sectionTitle)) {
      updatedContent = insertSection(updatedContent, sectionTitle);
    }
  }

  return updatedContent;
}
