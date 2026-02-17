"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/types/project";
import { Thread } from "@/types";
import { useProjects } from "@/providers/projects-provider";
import { useThreads } from "@/providers/threads-provider";
import { useChat } from "@/providers/chat-provider";
import { getProject, getProjectThreads } from "@/lib/db/projects";
import { isTauriContext } from "@/lib/db";
import ProjectThreadsList from "./ProjectThreadsList";
import ChatInput from "@/components/chat/ChatInput";
import ChatThread from "@/components/chat/ChatThread";
import ActivityIndicator from "@/components/chat/ActivityIndicator";
import EditProjectDialog from "./EditProjectDialog";

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export default function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const { touchProject, archiveProject: archiveProjectFromProvider, refreshProjects } = useProjects();
  const { createThread, setActiveThread, archiveThread, activeThreadId } = useThreads();
  const { messages, activityState, sendMessage, loadMessages, clearMessages } = useChat();

  const [project, setProject] = useState<Project | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Load project and its threads
  useEffect(() => {
    const loadProjectData = async () => {
      if (!isTauriContext()) {
        setIsLoading(false);
        return;
      }

      try {
        const [loadedProject, loadedThreads] = await Promise.all([
          getProject(projectId),
          getProjectThreads(projectId),
        ]);

        if (!loadedProject) {
          onBack();
          return;
        }

        setProject(loadedProject);
        setThreads(loadedThreads);
      } catch (error) {
        console.error("Failed to load project:", error);
        onBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectData();

    // Cleanup: clear messages and thread when leaving
    return () => {
      clearMessages();
      setActiveThread(null);
    };
  }, [projectId, onBack, clearMessages, setActiveThread]);

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
    }
  }, [activeThreadId, loadMessages]);

  const refreshThreads = useCallback(async () => {
    if (!isTauriContext()) return;
    try {
      const loadedThreads = await getProjectThreads(projectId);
      setThreads(loadedThreads);
    } catch (error) {
      console.error("Failed to refresh threads:", error);
    }
  }, [projectId]);

  const handleThreadClick = useCallback((threadId: string) => {
    setActiveThread(threadId);
  }, [setActiveThread]);

  const handleArchiveThread = useCallback(async (threadId: string) => {
    await archiveThread(threadId);
    if (activeThreadId === threadId) {
      setActiveThread(null);
      clearMessages();
    }
    await refreshThreads();
  }, [archiveThread, activeThreadId, setActiveThread, clearMessages, refreshThreads]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // If no active thread, create one in this project first
    if (!activeThreadId) {
      const title = content.length > 30 ? content.slice(0, 30) + "..." : content;
      const newThread = await createThread(title, projectId);
      setActiveThread(newThread.id);
      // Add the new thread to local state
      setThreads((prev) => [newThread, ...prev]);
      // Touch project to update its timestamp
      await touchProject(projectId);
    }

    // Send the message
    sendMessage(content);

    // Refresh threads after a short delay to get updated timestamps
    setTimeout(refreshThreads, 500);
  }, [activeThreadId, createThread, projectId, setActiveThread, touchProject, sendMessage, refreshThreads]);

  const handleBackToThreads = useCallback(() => {
    setActiveThread(null);
    clearMessages();
  }, [setActiveThread, clearMessages]);

  const handleProjectUpdated = useCallback(async () => {
    if (!isTauriContext()) return;
    const updatedProject = await getProject(projectId);
    if (updatedProject) {
      setProject(updatedProject);
    }
  }, [projectId]);

  const handleArchiveProject = useCallback(async () => {
    if (confirm("Are you sure you want to archive this project?")) {
      await archiveProjectFromProvider(projectId);
      await refreshProjects();
      onBack();
    }
  }, [archiveProjectFromProvider, projectId, refreshProjects, onBack]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-(--text-secondary)">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // Show chat view when a thread is selected (don't wait for messages to load)
  const hasActiveThread = !!activeThreadId;

  return (
    <div className="project-detail-view flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-color)/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors"
            aria-label="Back to projects"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <div>
            <h1
              className="text-lg font-medium text-(--text-primary)"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {project.name}
            </h1>
            {project.customPrompt && (
              <p className="text-xs text-(--text-secondary) mt-0.5 max-w-md truncate">
                {project.customPrompt}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditDialogOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors"
            aria-label="Edit project"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
              />
            </svg>
          </button>
          <button
            onClick={handleArchiveProject}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-(--text-secondary) hover:text-red-600 transition-colors"
            aria-label="Archive project"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20 9-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {hasActiveThread ? (
            <motion.div
              key="chat"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Back to threads button */}
              <div className="px-6 py-2 border-b border-(--border-color)/50">
                <button
                  onClick={handleBackToThreads}
                  className="flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
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
                      d="M15.75 19.5 8.25 12l7.5-7.5"
                    />
                  </svg>
                  All threads
                </button>
              </div>
              <ChatThread messages={messages} />
            </motion.div>
          ) : (
            <motion.div
              key="threads-list"
              className="flex-1 overflow-y-auto px-6 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-w-2xl mx-auto">
                <h2 className="text-sm font-medium text-(--text-secondary) uppercase tracking-wider mb-3">
                  Conversations
                </h2>
                <ProjectThreadsList
                  threads={threads}
                  activeThreadId={activeThreadId}
                  onThreadClick={handleThreadClick}
                  onArchiveThread={handleArchiveThread}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="shrink-0 p-4 pb-6">
          {/* Activity indicator */}
          <div className="flex w-full max-w-3xl mx-auto justify-start">
            <AnimatePresence>
              {activityState !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mb-2"
                >
                  <ActivityIndicator state={activityState} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ChatInput
            onSend={handleSendMessage}
            activityState={activityState}
            placeholder={
              hasActiveThread
                ? "Continue the conversation..."
                : "Start a new conversation..."
            }
          />
        </div>
      </div>

      {/* Edit Project Dialog */}
      <EditProjectDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        project={project}
        onUpdated={handleProjectUpdated}
      />
    </div>
  );
}
