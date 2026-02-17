"use client";

import { useEffect, useState } from "react";
import { Project } from "@/types/project";
import { getProjectThreadCount } from "@/lib/db/projects";
import { isTauriContext } from "@/lib/db";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  const [threadCount, setThreadCount] = useState<number>(0);

  useEffect(() => {
    const loadThreadCount = async () => {
      if (!isTauriContext()) return;
      try {
        const count = await getProjectThreadCount(project.id);
        setThreadCount(count);
      } catch (error) {
        console.error("Failed to load thread count:", error);
      }
    };
    loadThreadCount();
  }, [project.id]);

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

  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-white rounded-lg border border-(--border-color) hover:border-(--accent)/30 hover:shadow-sm transition-all text-left group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-(--text-primary) truncate group-hover:text-(--accent) transition-colors">
            {project.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-(--text-secondary)">
            <span>
              {threadCount} {threadCount === 1 ? "thread" : "threads"}
            </span>
            <span>·</span>
            <span>{formatRelativeTime(project.updatedAt)}</span>
          </div>
          {project.customPrompt && (
            <p className="mt-2 text-xs text-(--text-secondary) line-clamp-2">
              {project.customPrompt}
            </p>
          )}
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-md bg-(--background-color) text-(--text-secondary) group-hover:text-(--accent) transition-colors">
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
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
