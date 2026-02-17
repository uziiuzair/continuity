"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { DocumentTab } from "@/providers/documents-provider";
import DocumentEditor from "./DocumentEditor";

interface SplitViewProps {
  leftTab: DocumentTab;
  rightTab: DocumentTab;
  onTitleChange?: (threadId: string, newTitle: string) => void;
}

export default function SplitView({
  leftTab,
  rightTab,
  onTitleChange,
}: SplitViewProps) {
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="split-view flex h-full">
      <div style={{ width: `${splitRatio * 100}%` }} className="min-w-0">
        <DocumentEditor
          threadId={leftTab.threadId}
          title={leftTab.title}
          onTitleChange={(t) => onTitleChange?.(leftTab.threadId, t)}
        />
      </div>
      <div
        className="split-divider"
        onMouseDown={handleMouseDown}
      >
        <div className="split-divider-line" />
      </div>
      <div style={{ width: `${(1 - splitRatio) * 100}%` }} className="min-w-0">
        <DocumentEditor
          threadId={rightTab.threadId}
          title={rightTab.title}
          onTitleChange={(t) => onTitleChange?.(rightTab.threadId, t)}
        />
      </div>
    </div>
  );
}
