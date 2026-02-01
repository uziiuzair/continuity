"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

// Simple filter function for slash menu items
function filterSuggestionItems(
  items: DefaultReactSuggestionItem[],
  query: string
): DefaultReactSuggestionItem[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return items;

  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const aliasMatch = item.aliases?.some((alias) =>
      alias.toLowerCase().includes(lowerQuery)
    );
    return titleMatch || aliasMatch;
  });
}
import { useCanvas } from "@/providers/canvas-provider";
import { useThreads } from "@/providers/threads-provider";
import { CanvasContent } from "@/types";
import { customSchema, CustomSchema } from "@/lib/canvas/schema";
import { serializeDatabaseData, createDefaultDatabase } from "@/lib/canvas/database";

// Type for partial blocks that can be passed to the editor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PartialBlock = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomEditor = any;

// Custom slash menu item to insert a database block
const insertDatabaseItem = (editor: CustomEditor): DefaultReactSuggestionItem => ({
  title: "Database",
  onItemClick: () => {
    const currentBlock = editor.getTextCursorPosition().block;
    editor.insertBlocks(
      [
        {
          type: "database",
          props: {
            data: serializeDatabaseData(createDefaultDatabase("Untitled Database")),
          },
        },
      ],
      currentBlock,
      "after"
    );
  },
  aliases: ["database", "table", "db", "kanban", "list"],
  group: "Other",
  icon: <span style={{ fontSize: "14px" }}>⊞</span>,
  subtext: "Create a database with table, list, or kanban views",
});

// Get custom slash menu items including database
const getCustomSlashMenuItems = (editor: CustomEditor): DefaultReactSuggestionItem[] => [
  ...getDefaultReactSlashMenuItems(editor),
  insertDatabaseItem(editor),
];

export default function Editor() {
  const {
    content,
    isLoading,
    isSaving,
    isDirty,
    updateContent,
  } = useCanvas();
  const { activeThreadId } = useThreads();

  // Track if initial content has been loaded for this thread
  const initializedForThread = useRef<string | null>(null);
  // Track last content we sent to provider to avoid duplicate updates
  const lastSentContentRef = useRef<string | null>(null);

  // Create the editor with custom schema that includes database block
  const editor = useCreateBlockNote({
    schema: customSchema,
    initialContent:
      content && content.length > 0 ? (content as PartialBlock[]) : undefined,
  });

  // NOTE: BlockNote editor registration removed - this file is kept for reference only.
  // The custom editor (CustomEditor.tsx) is now the primary editor.

  // Load content ONLY when thread changes (not on every content update)
  useEffect(() => {
    // Skip if we've already initialized for this thread
    if (initializedForThread.current === activeThreadId) {
      return;
    }

    // Mark this thread as initialized
    initializedForThread.current = activeThreadId;

    if (content && content.length > 0) {
      editor.replaceBlocks(editor.document, content as PartialBlock[]);
      lastSentContentRef.current = JSON.stringify(content);
    } else if (activeThreadId) {
      // Empty canvas for this thread - clear editor
      editor.replaceBlocks(editor.document, [
        { type: "paragraph", content: [] } as PartialBlock,
      ]);
      lastSentContentRef.current = null;
    }
  }, [activeThreadId, content, editor]);

  // Handle editor changes - this is the ONLY way content flows to provider
  const handleChange = () => {
    const blocks = editor.document;
    const blocksJson = JSON.stringify(blocks);

    // Skip if content hasn't meaningfully changed
    if (blocksJson === lastSentContentRef.current) {
      return;
    }

    lastSentContentRef.current = blocksJson;
    updateContent(blocks as CanvasContent);
  };

  // Status indicator
  const statusText = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isSaving) return "Saving...";
    if (isDirty) return "Unsaved";
    return "";
  }, [isLoading, isSaving, isDirty]);

  if (!activeThreadId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Select a thread to view its canvas</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {statusText && (
        <div className="absolute top-0 right-0 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-bl z-10">
          {statusText}
        </div>
      )}
      <BlockNoteView editor={editor} theme="light" onChange={handleChange} slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getCustomSlashMenuItems(editor), query)
          }
        />
      </BlockNoteView>
    </div>
  );
}
