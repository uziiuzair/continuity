"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "@/providers/onboarding-provider";

export default function McpStatusStep() {
  const { completeOnboarding, memoryCount, goToStep } = useOnboarding();
  const hasExistingMemories = memoryCount > 0;

  const handleFinish = async () => {
    await completeOnboarding();
  };

  return (
    <div className="max-w-md mx-auto px-6">
      {/* Step indicator */}
      <motion.div
        className="flex items-center justify-center gap-2 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="w-2 h-2 rounded-full bg-(--accent)" />
        <div className="w-8 h-px bg-(--accent)/40" />
        <div className="w-2 h-2 rounded-full bg-(--accent)" />
      </motion.div>

      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2
          className="text-2xl font-normal mb-2 text-(--text-primary)"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Your knowledge base
        </h2>
        <p className="text-sm text-(--text-secondary)">
          {hasExistingMemories
            ? "Your KB is already growing from your other tools."
            : "Everything you discuss gets stored locally and syncs across tools."
          }
        </p>
      </motion.div>

      {/* Status Cards */}
      <motion.div
        className="space-y-3 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {/* Memory Server Status */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-(--border-color)/40 bg-white/40">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <path d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--text-primary)">
              Memory server running
            </p>
            <p className="text-xs text-(--text-secondary)">
              Local SQLite — your data, your machine
            </p>
          </div>
        </div>

        {/* Memory Count */}
        {hasExistingMemories && (
          <motion.div
            className="flex items-center gap-3 p-4 rounded-xl border border-(--accent)/20 bg-(--accent)/5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="w-9 h-9 rounded-lg bg-(--accent)/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-(--accent)">
                {memoryCount}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-(--text-primary)">
                Memories already stored
              </p>
              <p className="text-xs text-(--text-secondary)">
                From Claude Code, Cursor, and other connected tools
              </p>
            </div>
          </motion.div>
        )}

        {/* Cross-tool sync */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-(--border-color)/40 bg-white/40">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <path d="M8 6h13" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <circle cx="4" cy="6" r="1.5" />
              <circle cx="4" cy="12" r="1.5" />
              <circle cx="4" cy="18" r="1.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--text-primary)">
              Cross-tool sync ready
            </p>
            <p className="text-xs text-(--text-secondary)">
              Any MCP-compatible tool can read and write to your KB
            </p>
          </div>
        </div>

        {/* Privacy */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-(--border-color)/40 bg-white/40">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--text-primary)">
              100% private
            </p>
            <p className="text-xs text-(--text-secondary)">
              No cloud. No accounts. No tracking.
            </p>
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => goToStep("api-key")}
          className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
        >
          Back
        </button>

        <button
          onClick={handleFinish}
          className="px-8 py-2.5 rounded-full text-sm font-medium text-white bg-(--accent) hover:opacity-90 transition-opacity shadow-md shadow-(--accent)/20"
        >
          {hasExistingMemories
            ? "Open your workspace"
            : "Start building your KB"
          }
        </button>
      </motion.div>
    </div>
  );
}
