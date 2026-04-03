"use client";

import { McpMemory, MemoryType } from "@/providers/memories-provider";
import { cn } from "@/lib/utils";

interface MemoryCardProps {
  memory: McpMemory;
  isSelected: boolean;
  onClick: () => void;
}

const TYPE_COLORS: Record<MemoryType, string> = {
  decision: "bg-blue-50 text-blue-600",
  preference: "bg-purple-50 text-purple-600",
  context: "bg-gray-100 text-gray-600",
  constraint: "bg-red-50 text-red-600",
  pattern: "bg-green-50 text-green-600",
};

export default function MemoryCard({
  memory,
  isSelected,
  onClick,
}: MemoryCardProps) {
  const tags: string[] = memory.tags ? JSON.parse(memory.tags) : [];
  const timeAgo = formatTimeAgo(memory.updated_at);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-colors cursor-pointer",
        isSelected ? "bg-black/5" : "hover:bg-black/3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-(--text-primary) truncate">
          {memory.key}
        </span>
        <span
          className={cn(
            "shrink-0 px-1.5 py-0.5 text-[10px] rounded-full font-medium",
            TYPE_COLORS[memory.type]
          )}
        >
          {memory.type}
        </span>
      </div>

      <p className="text-xs text-(--text-secondary) mt-1 line-clamp-2">
        {memory.content}
      </p>

      <div className="flex items-center gap-2 mt-2">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-1.5 py-0.5 bg-black/5 rounded text-(--text-secondary)"
          >
            {tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="text-[10px] text-(--text-secondary)/50">
            +{tags.length - 3}
          </span>
        )}
        <span className="ml-auto text-[10px] text-(--text-secondary)/50">
          v{memory.version} · {timeAgo}
        </span>
      </div>
    </button>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
