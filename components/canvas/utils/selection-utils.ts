/**
 * Selection utilities for text formatting in contentEditable blocks
 */

export interface TextSelection {
  anchorNode: Node;
  anchorOffset: number;
  focusNode: Node;
  focusOffset: number;
  text: string;
  isCollapsed: boolean;
  startOffset: number;
  endOffset: number;
  blockElement: HTMLElement | null;
  blockId: string | null;
}

/**
 * Get the current text selection within a contentEditable block
 * Returns null if no selection or selection is collapsed
 */
export function getTextSelection(): TextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);

  // Find the containing block element
  let blockElement: HTMLElement | null = null;
  let node: Node | null = range.commonAncestorContainer;

  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      const blockId = node.getAttribute("data-block-id");
      if (blockId) {
        blockElement = node;
        break;
      }
    }
    node = node.parentNode;
  }

  if (!blockElement) return null;

  // Calculate text offsets relative to the block element
  const blockText = blockElement.textContent || "";
  const rangeText = range.toString();

  // Find start offset by walking through text nodes
  const startOffset = getTextOffset(blockElement, range.startContainer, range.startOffset);
  const endOffset = getTextOffset(blockElement, range.endContainer, range.endOffset);

  return {
    anchorNode: selection.anchorNode!,
    anchorOffset: selection.anchorOffset,
    focusNode: selection.focusNode!,
    focusOffset: selection.focusOffset,
    text: rangeText,
    isCollapsed: range.collapsed,
    startOffset: Math.min(startOffset, endOffset),
    endOffset: Math.max(startOffset, endOffset),
    blockElement,
    blockId: blockElement.getAttribute("data-block-id"),
  };
}

/**
 * Get the bounding rectangle for positioning the formatting toolbar
 * Returns null if no valid selection
 */
export function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // If rect has no dimensions, try to get from anchor node
  if (rect.width === 0 && rect.height === 0) {
    const anchorNode = selection.anchorNode;
    if (anchorNode && anchorNode.parentElement) {
      return anchorNode.parentElement.getBoundingClientRect();
    }
    return null;
  }

  return rect;
}

/**
 * Save the current selection state for later restoration
 */
export interface SavedSelection {
  blockId: string;
  startOffset: number;
  endOffset: number;
}

export function saveSelection(): SavedSelection | null {
  const selection = getTextSelection();
  if (!selection || !selection.blockId) return null;

  return {
    blockId: selection.blockId,
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
  };
}

/**
 * Restore a previously saved selection
 */
export function restoreSelection(saved: SavedSelection): boolean {
  const blockElement = document.querySelector(
    `[data-block-id="${saved.blockId}"]`
  ) as HTMLElement | null;

  if (!blockElement) return false;

  const selection = window.getSelection();
  if (!selection) return false;

  const range = document.createRange();

  try {
    // Find the text nodes and offsets
    const startResult = findNodeAtOffset(blockElement, saved.startOffset);
    const endResult = findNodeAtOffset(blockElement, saved.endOffset);

    if (!startResult || !endResult) return false;

    range.setStart(startResult.node, startResult.offset);
    range.setEnd(endResult.node, endResult.offset);

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch {
    return false;
  }
}

/**
 * Set cursor position within a block element
 */
export function setCursorPosition(
  blockElement: HTMLElement,
  offset: number
): boolean {
  const selection = window.getSelection();
  if (!selection) return false;

  const result = findNodeAtOffset(blockElement, offset);
  if (!result) return false;

  const range = document.createRange();
  range.setStart(result.node, result.offset);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

/**
 * Helper: Calculate text offset from start of element to a specific node/offset
 */
function getTextOffset(root: Node, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

  let node = walker.nextNode();
  while (node) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.textContent?.length || 0;
    node = walker.nextNode();
  }

  // If targetNode is the element itself, use targetOffset directly
  if (targetNode === root) {
    return targetOffset;
  }

  return offset;
}

/**
 * Helper: Find the text node and local offset for a given character offset
 */
function findNodeAtOffset(
  root: HTMLElement,
  targetOffset: number
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

  let currentOffset = 0;
  let node = walker.nextNode();

  while (node) {
    const nodeLength = node.textContent?.length || 0;

    if (currentOffset + nodeLength >= targetOffset) {
      return {
        node,
        offset: targetOffset - currentOffset,
      };
    }

    currentOffset += nodeLength;
    node = walker.nextNode();
  }

  // If we've exhausted all nodes but haven't reached the offset,
  // return the last text node at its end
  const lastNode = walker.currentNode;
  if (lastNode && lastNode.nodeType === Node.TEXT_NODE) {
    return {
      node: lastNode,
      offset: lastNode.textContent?.length || 0,
    };
  }

  // If no text nodes, create one
  if (!root.firstChild) {
    const textNode = document.createTextNode("");
    root.appendChild(textNode);
    return { node: textNode, offset: 0 };
  }

  return null;
}
