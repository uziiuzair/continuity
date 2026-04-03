"use client";

import { useState } from "react";
import { McpMemory, McpProject } from "@/providers/memories-provider";
import MemoryCard from "./MemoryCard";
import { cn } from "@/lib/utils";

interface ProjectMemoriesProps {
  projects: McpProject[];
  memories: McpMemory[];
  selectedId: string | null;
  onSelect: (memory: McpMemory) => void;
}

export default function ProjectMemories({
  projects,
  memories,
  selectedId,
  onSelect,
}: ProjectMemoriesProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(projects.map((p) => p.id))
  );

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const memoriesByProject = new Map<string, McpMemory[]>();
  for (const mem of memories) {
    if (mem.project_id) {
      const existing = memoriesByProject.get(mem.project_id) || [];
      existing.push(mem);
      memoriesByProject.set(mem.project_id, existing);
    }
  }

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-(--text-secondary)/50 px-4 text-center">
        No projects yet. Create a project via the MCP server to organize
        project-specific memories.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {projects.map((project) => {
        const projectMems = memoriesByProject.get(project.id) || [];
        const isExpanded = expandedProjects.has(project.id);

        return (
          <div key={project.id}>
            <button
              onClick={() => toggleProject(project.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/3 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={cn(
                  "size-3 transition-transform text-(--text-secondary)",
                  isExpanded && "rotate-90"
                )}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
              <span className="text-sm font-medium text-(--text-primary)">
                {project.name}
              </span>
              <span className="text-xs text-(--text-secondary)/50 ml-auto">
                {projectMems.length}
              </span>
            </button>

            {isExpanded && (
              <div className="ml-2 mt-1 space-y-1">
                {projectMems.length === 0 ? (
                  <p className="text-xs text-(--text-secondary)/50 px-2 py-2">
                    No memories in this project
                  </p>
                ) : (
                  projectMems.map((mem) => (
                    <MemoryCard
                      key={mem.id}
                      memory={mem}
                      isSelected={mem.id === selectedId}
                      onClick={() => onSelect(mem)}
                    />
                  ))
                )}
              </div>
            )}

            {project.description && isExpanded && (
              <p className="text-xs text-(--text-secondary)/50 px-4 mt-1">
                {project.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
