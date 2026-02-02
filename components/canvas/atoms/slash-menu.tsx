"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HeadingIcon } from "@/components/icons/heading-icon";
import { ListIcon } from "@/components/icons/list-icon";
import { ParagraphIcon } from "@/components/icons/paragraph-icon";
import { TableIcon } from "@/components/icons/table-icon";
import { CodeIcon } from "@/components/icons/code-icon";
import { cn } from "@/lib/utils";

export interface SlashMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  type: string;
  props?: Record<string, unknown>;
}

const MENU_ITEMS: SlashMenuItem[] = [
  {
    id: "text",
    icon: <ParagraphIcon className="size-4" />,
    label: "Text",
    description: "Plain text paragraph",
    type: "paragraph",
  },
  {
    id: "heading1",
    icon: <HeadingIcon className="size-4" />,
    label: "Heading 1",
    description: "Large section heading",
    type: "heading",
    props: { level: 1 },
  },
  {
    id: "heading2",
    icon: <HeadingIcon className="size-4" />,
    label: "Heading 2",
    description: "Medium section heading",
    type: "heading",
    props: { level: 2 },
  },
  {
    id: "heading3",
    icon: <HeadingIcon className="size-4" />,
    label: "Heading 3",
    description: "Small section heading",
    type: "heading",
    props: { level: 3 },
  },
  {
    id: "bullet",
    icon: <ListIcon className="size-4" />,
    label: "Bulleted List",
    description: "Create a bulleted list",
    type: "listItem",
    props: { listType: "bullet" },
  },
  {
    id: "numbered",
    icon: <ListIcon className="size-4" />,
    label: "Numbered List",
    description: "Create a numbered list",
    type: "listItem",
    props: { listType: "numbered" },
  },
  {
    id: "todo",
    icon: <ListIcon className="size-4" />,
    label: "To-do List",
    description: "Track tasks with checkboxes",
    type: "listItem",
    props: { listType: "todo", checked: false },
  },
  {
    id: "code",
    icon: <CodeIcon className="size-4" />,
    label: "Code",
    description: "Code block with syntax highlighting",
    type: "code",
    props: { language: "plaintext" },
  },
  {
    id: "database",
    icon: <TableIcon className="size-4" />,
    label: "Database",
    description: "Table, Kanban, or Tasks view",
    type: "database",
  },
];

interface SlashMenuProps {
  position: { x: number; y: number };
  filter: string;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}

export function SlashMenu({
  position,
  filter,
  onSelect,
  onClose,
}: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items based on search query
  const filteredItems = MENU_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(filter.toLowerCase()) ||
      item.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredItems.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelect(filteredItems[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = menuRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filteredItems.length === 0) {
    return (
      <div
        ref={menuRef}
        className="slash-menu"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="slash-menu-empty">No results</div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="slash-menu-header">Add blocks</div>
      <div className="slash-menu-items">
        {filteredItems.map((item, index) => (
          <button
            key={item.id}
            data-index={index}
            className={cn(
              "slash-menu-item",
              index === selectedIndex && "selected"
            )}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="slash-menu-item-icon">{item.icon}</div>
            <div className="slash-menu-item-content">
              <div className="slash-menu-item-label">{item.label}</div>
              <div className="slash-menu-item-description">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
