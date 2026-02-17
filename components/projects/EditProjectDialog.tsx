"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/types/project";
import { useProjects } from "@/providers/projects-provider";

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdated: () => void;
}

export default function EditProjectDialog({
  isOpen,
  onClose,
  project,
  onUpdated,
}: EditProjectDialogProps) {
  const { updateProject } = useProjects();
  const [name, setName] = useState(project.name);
  const [customPrompt, setCustomPrompt] = useState(project.customPrompt || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setCustomPrompt(project.customPrompt || "");
      setError(null);
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await updateProject(project.id, {
        name: name.trim(),
        customPrompt: customPrompt.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={handleClose}
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <DialogPanel className="w-lg bg-(--background-color) rounded-lg shadow-xl border border-(--border-color) overflow-hidden">
                {/* Header */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-(--border-color)">
                  <h2 className="text-lg font-medium text-(--text-primary)">
                    Edit Project
                  </h2>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors disabled:opacity-50"
                    aria-label="Close"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label
                      htmlFor="project-name"
                      className="block text-sm font-medium text-(--text-primary) mb-1.5"
                    >
                      Name
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Product Launch Q2"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 rounded-md border border-(--border-color) bg-white text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent)/30 disabled:opacity-50"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom-prompt"
                      className="block text-sm font-medium text-(--text-primary) mb-1.5"
                    >
                      Custom AI Prompt{" "}
                      <span className="text-(--text-secondary) font-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="custom-prompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Add custom instructions for the AI when chatting in this project..."
                      disabled={isSubmitting}
                      rows={4}
                      className="w-full px-3 py-2 rounded-md border border-(--border-color) bg-white text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent)/30 disabled:opacity-50 resize-none"
                    />
                    <p className="mt-1.5 text-xs text-(--text-secondary)">
                      This prompt will be added to all conversations within this
                      project.
                    </p>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="px-4 py-2 text-sm font-medium bg-(--accent) text-white rounded-md hover:bg-(--accent)/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
