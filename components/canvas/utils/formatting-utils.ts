/**
 * DOM-based text formatting utilities
 *
 * Uses direct DOM manipulation to wrap selected text in styled spans,
 * then extracts the result back to InlineContent for persistence.
 */

import { InlineContent } from "../blocks/types";

export type StyleKey = "bold" | "italic" | "underline" | "strikethrough" | "code";

// Map style keys to CSS class names
const STYLE_CLASSES: Record<StyleKey, string> = {
  bold: "fmt-bold",
  italic: "fmt-italic",
  underline: "fmt-underline",
  strikethrough: "fmt-strikethrough",
  code: "fmt-code",
};

// Map style keys to HTML tag names (for parsing)
const STYLE_TAGS: Record<string, StyleKey> = {
  STRONG: "bold",
  B: "bold",
  EM: "italic",
  I: "italic",
  U: "underline",
  S: "strikethrough",
  STRIKE: "strikethrough",
  CODE: "code",
};

/**
 * Apply or remove a style to the current selection within a block element
 * Returns the new content as InlineContent[] for persistence
 */
export function applyStyleToSelection(
  blockElement: HTMLElement,
  style: StyleKey
): InlineContent[] | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  // Make sure selection is within our block
  if (!blockElement.contains(range.commonAncestorContainer)) {
    return null;
  }

  const className = STYLE_CLASSES[style];

  // Check if the selection is already fully styled
  const isStyled = isSelectionFullyStyled(range, className);

  if (isStyled) {
    removeStyleFromRange(blockElement, range, className);
  } else {
    applyStyleToRange(range, className);
  }

  // Extract the new content from the DOM
  return extractInlineContent(blockElement);
}

/**
 * Check if the entire selection has the given style class
 */
function isSelectionFullyStyled(range: Range, className: string): boolean {
  const ancestor = range.commonAncestorContainer;

  // If it's a text node, check its parent
  if (ancestor.nodeType === Node.TEXT_NODE) {
    return hasStyleClass(ancestor.parentElement, className);
  }

  // Check if the range is within a styled element
  if (ancestor instanceof HTMLElement) {
    // Get all text nodes in the range
    const textNodes = getTextNodesInRange(range);
    if (textNodes.length === 0) return false;

    // Check if all text nodes are within styled elements
    return textNodes.every(node => hasStyleClass(node.parentElement, className));
  }

  return false;
}

/**
 * Check if an element or its ancestors have the style class
 */
function hasStyleClass(element: Element | null, className: string): boolean {
  while (element) {
    if (element.classList?.contains(className)) {
      return true;
    }
    element = element.parentElement;
  }
  return false;
}

/**
 * Get all text nodes within a range
 */
function getTextNodesInRange(range: Range): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node = walker.nextNode();
  while (node) {
    if (range.intersectsNode(node)) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }

  return textNodes;
}

/**
 * Apply a style class to a range by wrapping in a span
 */
function applyStyleToRange(range: Range, className: string): void {
  // Handle simple case where selection is within a single text node
  if (
    range.startContainer === range.endContainer &&
    range.startContainer.nodeType === Node.TEXT_NODE
  ) {
    const span = document.createElement("span");
    span.className = className;
    range.surroundContents(span);
    return;
  }

  // Complex case: selection spans multiple nodes
  // We need to wrap each text node segment individually
  const textNodes = getTextNodesInRange(range);

  for (const textNode of textNodes) {
    // Determine the portion of this text node that's selected
    let startOffset = 0;
    let endOffset = textNode.length;

    if (textNode === range.startContainer) {
      startOffset = range.startOffset;
    }
    if (textNode === range.endContainer) {
      endOffset = range.endOffset;
    }

    // Skip if already has this style
    if (hasStyleClass(textNode.parentElement, className)) {
      continue;
    }

    // Split the text node if needed and wrap the selected portion
    if (startOffset > 0 || endOffset < textNode.length) {
      const selectedText = textNode.textContent?.slice(startOffset, endOffset) || "";
      const beforeText = textNode.textContent?.slice(0, startOffset) || "";
      const afterText = textNode.textContent?.slice(endOffset) || "";

      const parent = textNode.parentNode;
      if (!parent) continue;

      const fragment = document.createDocumentFragment();

      if (beforeText) {
        fragment.appendChild(document.createTextNode(beforeText));
      }

      const span = document.createElement("span");
      span.className = className;
      span.textContent = selectedText;
      fragment.appendChild(span);

      if (afterText) {
        fragment.appendChild(document.createTextNode(afterText));
      }

      parent.replaceChild(fragment, textNode);
    } else {
      // Wrap the entire text node
      const span = document.createElement("span");
      span.className = className;
      textNode.parentNode?.insertBefore(span, textNode);
      span.appendChild(textNode);
    }
  }
}

/**
 * Remove a style class from text within a range
 */
function removeStyleFromRange(
  blockElement: HTMLElement,
  range: Range,
  className: string
): void {
  const textNodes = getTextNodesInRange(range);

  for (const textNode of textNodes) {
    let element: Element | null = textNode.parentElement;

    // Find the styled span ancestor
    while (element && element !== blockElement) {
      if (element.classList?.contains(className)) {
        // Determine the portion of this text node that's selected
        let startOffset = 0;
        let endOffset = textNode.length;

        if (textNode === range.startContainer) {
          startOffset = range.startOffset;
        }
        if (textNode === range.endContainer) {
          endOffset = range.endOffset;
        }

        // If the entire text node is selected and the span only contains this text
        if (startOffset === 0 && endOffset === textNode.length &&
            element.childNodes.length === 1) {
          // Unwrap - replace span with its contents
          const parent = element.parentNode;
          if (parent) {
            while (element.firstChild) {
              parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
          }
        } else {
          // Partial selection - need to split the span
          const selectedText = textNode.textContent?.slice(startOffset, endOffset) || "";
          const beforeText = textNode.textContent?.slice(0, startOffset) || "";
          const afterText = textNode.textContent?.slice(endOffset) || "";

          const parent = element.parentNode;
          if (!parent) break;

          const fragment = document.createDocumentFragment();

          if (beforeText) {
            const beforeSpan = document.createElement("span");
            beforeSpan.className = className;
            beforeSpan.textContent = beforeText;
            fragment.appendChild(beforeSpan);
          }

          // Unformatted text
          fragment.appendChild(document.createTextNode(selectedText));

          if (afterText) {
            const afterSpan = document.createElement("span");
            afterSpan.className = className;
            afterSpan.textContent = afterText;
            fragment.appendChild(afterSpan);
          }

          // Replace the original span
          parent.replaceChild(fragment, element);
        }

        break;
      }
      element = element.parentElement;
    }
  }
}

/**
 * Extract InlineContent from a block element's DOM
 */
export function extractInlineContent(element: HTMLElement): InlineContent[] {
  const result: InlineContent[] = [];

  function processNode(node: Node, inheritedStyles: Set<StyleKey>): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        const styles: InlineContent["styles"] = {};
        inheritedStyles.forEach(style => {
          styles[style] = true;
        });

        result.push({
          type: "text",
          text,
          styles: Object.keys(styles).length > 0 ? styles : undefined,
        });
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const newStyles = new Set(inheritedStyles);

      // Check for style classes
      for (const [style, className] of Object.entries(STYLE_CLASSES)) {
        if (el.classList?.contains(className)) {
          newStyles.add(style as StyleKey);
        }
      }

      // Check for HTML tags (for backwards compatibility)
      const tagStyle = STYLE_TAGS[el.tagName];
      if (tagStyle) {
        newStyles.add(tagStyle);
      }

      // Process children
      for (const child of el.childNodes) {
        processNode(child, newStyles);
      }
    }
  }

  processNode(element, new Set());

  // Merge adjacent items with same styles
  return mergeAdjacentContent(result);
}

/**
 * Convert InlineContent to HTML for rendering
 */
export function inlineContentToHtml(content: InlineContent[]): string {
  return content
    .map((item) => {
      let html = escapeHtml(item.text);
      const classes: string[] = [];

      if (item.styles?.bold) classes.push(STYLE_CLASSES.bold);
      if (item.styles?.italic) classes.push(STYLE_CLASSES.italic);
      if (item.styles?.underline) classes.push(STYLE_CLASSES.underline);
      if (item.styles?.strikethrough) classes.push(STYLE_CLASSES.strikethrough);
      if (item.styles?.code) classes.push(STYLE_CLASSES.code);

      if (classes.length > 0) {
        html = `<span class="${classes.join(" ")}">${html}</span>`;
      }

      return html;
    })
    .join("");
}

/**
 * Merge adjacent InlineContent items with identical styles
 */
function mergeAdjacentContent(content: InlineContent[]): InlineContent[] {
  if (content.length <= 1) return content;

  const result: InlineContent[] = [];

  for (const item of content) {
    if (item.text.length === 0) continue;

    const last = result[result.length - 1];

    if (last && stylesEqual(last.styles, item.styles)) {
      last.text += item.text;
    } else {
      result.push({ ...item });
    }
  }

  return result;
}

/**
 * Check if two style objects are equal
 */
function stylesEqual(
  a?: InlineContent["styles"],
  b?: InlineContent["styles"]
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const aKeys = Object.keys(a).filter(k => a[k as StyleKey]) as StyleKey[];
  const bKeys = Object.keys(b).filter(k => b[k as StyleKey]) as StyleKey[];

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(key => b[key]);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Get plain text from InlineContent
 */
export function getPlainText(content: InlineContent[]): string {
  return content.map(item => item.text).join("");
}

/**
 * Normalize content to InlineContent array
 */
export function normalizeToInlineContent(
  content: InlineContent[] | string | undefined
): InlineContent[] {
  if (!content) return [];
  if (typeof content === "string") {
    return content ? [{ type: "text", text: content }] : [];
  }
  return content;
}

/**
 * Check which styles are active in the current selection
 */
export function getActiveStylesInSelection(blockElement: HTMLElement): Record<StyleKey, boolean> {
  const result: Record<StyleKey, boolean> = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  };

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return result;
  }

  const range = selection.getRangeAt(0);
  if (!blockElement.contains(range.commonAncestorContainer)) {
    return result;
  }

  // Check each style
  for (const [style, className] of Object.entries(STYLE_CLASSES)) {
    result[style as StyleKey] = isSelectionFullyStyled(range, className);
  }

  return result;
}
