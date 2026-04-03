"use client";

import { useEffect, useState } from "react";
import {
  McpMemory,
  McpMemoryVersion,
  McpMemoryLink,
  MemoryType,
  useMemories,
} from "@/providers/memories-provider";
import VersionTimeline from "./VersionTimeline";
import { cn } from "@/lib/utils";

interface MemoryDetailProps {
  memory: McpMemory;
}

const TYPE_COLORS: Record<MemoryType, string> = {
  decision: "bg-blue-50 text-blue-600",
  preference: "bg-purple-50 text-purple-600",
  context: "bg-gray-100 text-gray-600",
  constraint: "bg-red-50 text-red-600",
  pattern: "bg-green-50 text-green-600",
};

export default function MemoryDetail({ memory }: MemoryDetailProps) {
  const { getVersionHistory, getLinkedMemories } = useMemories();
  const [versions, setVersions] = useState<McpMemoryVersion[]>([]);
  const [linkedMemories, setLinkedMemories] = useState<
    { link: McpMemoryLink; memory: McpMemory }[]
  >([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    getVersionHistory(memory.id).then(setVersions);
    getLinkedMemories(memory.id).then(setLinkedMemories);
  }, [memory.id, getVersionHistory, getLinkedMemories]);

  const tags: string[] = memory.tags ? JSON.parse(memory.tags) : [];
  const metadata: Record<string, unknown> = memory.metadata
    ? JSON.parse(memory.metadata)
    : {};

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex-1">
          <h2
            className="text-xl text-(--text-primary)"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {memory.key}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded-full font-medium",
                TYPE_COLORS[memory.type]
              )}
            >
              {memory.type}
            </span>
            <span className="text-xs text-(--text-secondary)">
              v{memory.version}
            </span>
            <span className="text-xs text-(--text-secondary)/50">·</span>
            <span className="text-xs text-(--text-secondary)/50">
              {memory.scope}
            </span>
          </div>
        </div>
        <span className="text-xs text-(--text-secondary)/50 shrink-0">
          {memory.id}
        </span>
      </div>

      {/* Content */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-(--text-secondary) uppercase tracking-wider mb-2">
          Content
        </h3>
        <div className="text-sm text-(--text-primary) bg-black/3 rounded-lg p-4 whitespace-pre-wrap">
          {memory.content}
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-(--text-secondary) uppercase tracking-wider mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-black/5 rounded-full text-(--text-secondary)"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      {Object.keys(metadata).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-(--text-secondary) uppercase tracking-wider mb-2">
            Metadata
          </h3>
          <div className="text-xs text-(--text-secondary) bg-black/3 rounded-lg p-3 font-mono">
            {JSON.stringify(metadata, null, 2)}
          </div>
        </div>
      )}

      {/* Linked Memories */}
      {linkedMemories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-(--text-secondary) uppercase tracking-wider mb-2">
            Linked Memories ({linkedMemories.length})
          </h3>
          <div className="space-y-1.5">
            {linkedMemories.map(({ link, memory: linked }) => (
              <div
                key={link.id}
                className="flex items-center gap-2 p-2 bg-black/3 rounded-md"
              >
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] rounded font-medium",
                    TYPE_COLORS[linked.type]
                  )}
                >
                  {link.relationship_type}
                </span>
                <span className="text-sm text-(--text-primary)">
                  {linked.key}
                </span>
                <span className="text-xs text-(--text-secondary) ml-auto">
                  v{linked.version}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version History */}
      <div>
        <button
          onClick={() => setShowVersions(!showVersions)}
          className="flex items-center gap-2 text-xs font-medium text-(--text-secondary) uppercase tracking-wider mb-2 hover:text-(--text-primary) transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={cn(
              "size-3 transition-transform",
              showVersions && "rotate-90"
            )}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
          Version History ({versions.length})
        </button>

        {showVersions && <VersionTimeline versions={versions} />}
      </div>

      {/* Timestamps */}
      <div className="mt-6 pt-4 border-t border-(--border-color)/30 flex gap-6 text-xs text-(--text-secondary)/50">
        <span>Created: {new Date(memory.created_at).toLocaleString()}</span>
        <span>Updated: {new Date(memory.updated_at).toLocaleString()}</span>
      </div>
    </div>
  );
}
