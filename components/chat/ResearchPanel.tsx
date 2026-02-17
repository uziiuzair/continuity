"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResearchProgress } from "@/types/research";

interface ResearchPanelProps {
  progress: ResearchProgress;
  onCancel: () => void;
}

const PHASE_LABELS: Record<string, string> = {
  planning: "Planning research...",
  searching: "Researching",
  reading: "Reading sources",
  analyzing: "Analyzing findings",
  synthesizing: "Writing report...",
  complete: "Research complete",
  cancelled: "Research cancelled",
  error: "Research failed",
};

export default function ResearchPanel({
  progress,
  onCancel,
}: ResearchPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isFinished = ["complete", "cancelled", "error"].includes(
    progress.phase
  );

  const elapsedSeconds = Math.round(progress.elapsedMs / 1000);
  const totalSources = progress.sources.length;
  const answeredCount = progress.subQuestions.filter(
    (sq) => sq.status === "answered"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto mb-4"
    >
      <div className="rounded-xl border border-(--border-color) bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-50/50">
          <div className="flex items-center gap-3">
            {!isFinished && <PulsingDot />}
            {isFinished && (
              <div className="size-2 rounded-full bg-green-500" />
            )}
            <span className="text-sm font-medium text-(--text-primary)">
              {PHASE_LABELS[progress.phase] || progress.phase}
            </span>
            {progress.phaseDetail && !isFinished && (
              <span className="text-xs text-(--text-secondary)">
                {progress.phaseDetail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2 text-xs text-(--text-secondary)">
              {progress.activeAgents > 0 && (
                <span>{progress.activeAgents} agents</span>
              )}
              {totalSources > 0 && <span>{totalSources} sources</span>}
              <span>{elapsedSeconds}s</span>
            </div>

            {/* Collapse/expand */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-stone-100 transition-colors"
              aria-label={isCollapsed ? "Expand" : "Collapse"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`size-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            {/* Cancel */}
            {!isFinished && (
              <button
                onClick={onCancel}
                className="px-2.5 py-1 text-xs rounded-md border border-(--border-color) hover:bg-stone-100 transition-colors text-(--text-secondary)"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Sub-questions list */}
        <AnimatePresence>
          {!isCollapsed && progress.subQuestions.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-(--border-color)"
            >
              <div className="px-4 py-3 space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {progress.subQuestions.map((sq) => (
                    <motion.div
                      key={sq.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2.5"
                    >
                      <SubQuestionStatus status={sq.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-(--text-primary) leading-snug">
                          {sq.question}
                        </p>
                        {sq.agentStatus && sq.status === "in-progress" && (
                          <p className="text-xs text-(--text-secondary) mt-0.5">
                            {sq.agentStatus}
                          </p>
                        )}
                        {sq.status === "answered" && sq.sources.length > 0 && (
                          <p className="text-xs text-(--text-secondary) mt-0.5">
                            {sq.sources.length} sources, {sq.findings.length}{" "}
                            findings
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Round indicator */}
                {progress.currentRound > 1 && (
                  <p className="text-xs text-(--text-secondary) pt-1 border-t border-(--border-color)">
                    Round {progress.currentRound} of research
                    {answeredCount > 0 &&
                      ` — ${answeredCount}/${progress.subQuestions.length} questions answered`}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SubQuestionStatus({
  status,
}: {
  status: "pending" | "in-progress" | "answered" | "error";
}) {
  switch (status) {
    case "pending":
      return (
        <div className="mt-1.5 size-2 rounded-full bg-stone-300 shrink-0" />
      );
    case "in-progress":
      return (
        <div className="mt-1 shrink-0">
          <svg
            className="animate-spin size-3.5 text-(--accent)"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      );
    case "answered":
      return (
        <div className="mt-1 shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-3.5 text-green-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        </div>
      );
    case "error":
      return (
        <div className="mt-1 shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-3.5 text-red-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
  }
}

function PulsingDot() {
  return (
    <span className="relative flex size-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--accent) opacity-75" />
      <span className="relative inline-flex rounded-full size-2 bg-(--accent)" />
    </span>
  );
}
