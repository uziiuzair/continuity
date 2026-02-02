"use client";

import { motion } from "framer-motion";
import { ActiveThread } from "@/types/briefing";

interface ThreadCardProps {
  thread: ActiveThread;
  onClick: () => void;
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "Yesterday")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ThreadCard({ thread, onClick }: ThreadCardProps) {
  const timeAgo = formatTimeAgo(thread.updatedAt);

  return (
    <motion.button
      onClick={onClick}
      className="w-full p-4 rounded-lg border border-(--border-color)/50 bg-white/50
                 hover:bg-[#f5f4ed] hover:border-(--border-color)
                 transition-all duration-200 text-left group"
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-sm font-medium text-[#3d3d3a] group-hover:text-(--accent) transition-colors line-clamp-1">
          {thread.title}
        </h3>
        <span className="text-xs text-(--text-secondary)/50 whitespace-nowrap shrink-0">
          {timeAgo}
        </span>
      </div>

      {thread.objective && (
        <p className="text-xs text-(--text-secondary)/80 mt-1.5 line-clamp-1">
          <span className="text-(--text-secondary)/50">Objective:</span>{" "}
          {thread.objective}
        </p>
      )}

      {thread.nextAction && (
        <p className="text-xs text-(--text-secondary)/70 mt-1 line-clamp-1">
          <span className="text-(--text-secondary)/50">Next:</span>{" "}
          {thread.nextAction}
        </p>
      )}
    </motion.button>
  );
}
