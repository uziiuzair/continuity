"use client";

import { useState, useRef, useEffect } from "react";
import { CanvasInstanceProvider, useCanvasInstance } from "@/providers/canvas-instance-provider";
import dynamic from "next/dynamic";
import { updateThread } from "@/lib/db/threads";
import { isTauriContext } from "@/lib/db";

const CustomEditor = dynamic(
  () => import("@/components/canvas/CustomEditor"),
  { ssr: false }
);

interface DocumentEditorProps {
  threadId: string;
  title: string;
  onTitleChange?: (newTitle: string) => void;
}

function EditorInner({ threadId, title, onTitleChange }: DocumentEditorProps) {
  const canvas = useCanvasInstance();
  const [editedTitle, setEditedTitle] = useState(title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = async () => {
    const trimmed = editedTitle.trim();
    if (!trimmed) {
      setEditedTitle(title);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed !== title && isTauriContext()) {
      await updateThread(threadId, trimmed);
      onTitleChange?.(trimmed);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="document-editor flex flex-col h-full">
      <header className="document-editor-header">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleTitleSubmit();
              } else if (e.key === "Escape") {
                setEditedTitle(title);
                setIsEditingTitle(false);
              }
            }}
            className="document-editor-title-input"
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="document-editor-title"
          >
            {editedTitle}
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
          {canvas.isSaving && <span>Saving...</span>}
          {canvas.isDirty && !canvas.isSaving && <span>Unsaved</span>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <CustomEditor threadId={threadId} canvasOverride={canvas} />
      </div>
    </div>
  );
}

export default function DocumentEditor(props: DocumentEditorProps) {
  return (
    <CanvasInstanceProvider threadId={props.threadId}>
      <EditorInner {...props} />
    </CanvasInstanceProvider>
  );
}
