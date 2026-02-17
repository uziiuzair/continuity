"use client";

import { useState } from "react";
import { useProjects } from "@/providers/projects-provider";
import ProjectCard from "./ProjectCard";
import CreateProjectDialog from "./CreateProjectDialog";
import ProjectDetailView from "./ProjectDetailView";

export default function ProjectsPage() {
  const { projects, isLoading, createProject, setActiveProject } = useProjects();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveProject(projectId);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setActiveProject(null);
  };

  const handleCreateProject = async (name: string, customPrompt?: string) => {
    const project = await createProject(name, customPrompt);
    setSelectedProjectId(project.id);
    setActiveProject(project.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-(--text-secondary)">Loading...</div>
      </div>
    );
  }

  // Show project detail view if a project is selected
  if (selectedProjectId) {
    return (
      <ProjectDetailView
        projectId={selectedProjectId}
        onBack={handleBackToProjects}
      />
    );
  }

  return (
    <div className="projects-page flex flex-col h-full container mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)/50">
        <h1
          className="text-xl font-medium text-(--text-primary)"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Projects
        </h1>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-(--accent) text-white rounded-md hover:bg-(--accent)/90 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-(--background-color)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6 text-(--text-secondary)"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                />
              </svg>
            </div>
            <h3 className="text-base font-medium text-(--text-primary) mb-1">
              No projects yet
            </h3>
            <p className="text-sm text-(--text-secondary) mb-4">
              Create a project to organize related conversations with custom AI
              instructions.
            </p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-(--accent) text-white rounded-md hover:bg-(--accent)/90 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
}
