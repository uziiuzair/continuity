"use client";

import { Thread } from "@/types";
import { cn } from "@/lib/utils";

interface ProjectThreadsListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onArchiveThread: (threadId: string) => void;
}

export default function ProjectThreadsList({
  threads,
  activeThreadId,
  onThreadClick,
  onArchiveThread,
}: ProjectThreadsListProps) {
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 mb-3 flex items-center justify-center rounded-full bg-(--background-color)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5 text-(--text-secondary)"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
        <p className="text-sm text-(--text-secondary)">
          No conversations yet
        </p>
        <p className="text-xs text-(--text-secondary)/75 mt-1">
          Start chatting below to create a thread
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {threads.map((thread) => (
        <div
          key={thread.id}
          role="button"
          tabIndex={0}
          onClick={() => onThreadClick(thread.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onThreadClick(thread.id);
            }
          }}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group",
            activeThreadId === thread.id
              ? "bg-(--accent)/10 border border-(--accent)/20"
              : "hover:bg-(--background-color)"
          )}
        >
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-(--text-primary) truncate">
              {thread.title}
            </h4>
            <p className="text-xs text-(--text-secondary) mt-0.5">
              {formatRelativeTime(thread.updatedAt)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchiveThread(thread.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-(--text-secondary) hover:text-red-600 transition-all"
            title="Archive thread"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20 9-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
