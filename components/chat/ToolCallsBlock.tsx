"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ToolCallDisplay } from "@/types";
import { cn } from "@/lib/utils";

interface ToolCallsBlockProps {
  toolCalls: ToolCallDisplay[];
}

/** Human-readable labels for known tools */
const TOOL_LABELS: Record<string, string> = {
  web_search: "Web Search",
  read_url: "Read URL",
  get_current_time: "Get Time",
  add_to_canvas: "Write to Canvas",
  update_block: "Update Canvas",
  delete_block: "Delete Block",
  read_canvas: "Read Canvas",
  remember_information: "Save Memory",
  recall_information: "Search Memory",
  forget_information: "Forget Memory",
  deep_research: "Deep Research",
  create_task: "Create Artifact",
  create_artifact: "Create Artifact",
  create_database: "Create Database",
  add_database_row: "Add Database Row",
  update_database_row: "Update Row",
  query_database: "Query Database",
  add_open_loop: "Track Open Loop",
  add_blocker: "Add Blocker",
  record_decision: "Record Decision",
  get_work_state: "Get Work State",
};

function getToolLabel(name: string): string {
  if (TOOL_LABELS[name]) return TOOL_LABELS[name];
  // MCP tools: "mcp__serverId__toolName" → "serverId · toolName"
  if (name.includes("__")) {
    const parts = name.split("__");
    if (parts.length >= 3) {
      return `${parts[1]} · ${parts.slice(2).join("_")}`;
    }
  }
  // Fallback: prettify snake_case
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Generate summary text for collapsed preview */
function getToolSummary(tc: ToolCallDisplay): string {
  const args = tc.arguments;
  switch (tc.name) {
    case "web_search":
      return `Searched for "${args.query || ""}"`;
    case "read_url":
      try {
        const hostname = new URL(args.url as string).hostname;
        return `Read ${hostname}`;
      } catch {
        return `Read URL`;
      }
    case "add_to_canvas":
      if (Array.isArray(args.blocks)) return `Wrote ${args.blocks.length} blocks`;
      return "Wrote to canvas";
    case "remember_information":
      return `Saved "${args.key || ""}"`;
    case "recall_information":
      return `Searched memory for "${args.query || ""}"`;
    case "forget_information":
      return `Forgot "${args.key || ""}"`;
    case "create_task":
    case "create_artifact":
      return `Created "${args.title || ""}"`;
    default:
      if (tc.name.includes("__")) {
        const parts = tc.name.split("__");
        return `Called ${parts.length >= 3 ? parts.slice(2).join("_") : tc.name}`;
      }
      return getToolLabel(tc.name);
  }
}

/** Truncate long strings for display */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}

function StatusIcon({ tc }: { tc: ToolCallDisplay }) {
  if (tc.completedAt == null) {
    // Still executing — spinner
    return (
      <div className="mt-0.5 shrink-0">
        <svg
          className="animate-spin size-3 text-stone-400"
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
  }
  if (tc.success === false) {
    // Failed — X
    return (
      <div className="mt-0.5 shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="size-3 text-red-400"
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
  // Success — checkmark
  return (
    <div className="mt-0.5 shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="size-3 text-green-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 12.75 6 6 9-13.5"
        />
      </svg>
    </div>
  );
}

/** Format argument values for display */
function formatArgValue(value: unknown): string {
  if (typeof value === "string") return truncate(value, 120);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object" && value !== null) return JSON.stringify(value).slice(0, 120);
  return String(value);
}

export default function ToolCallsBlock({ toolCalls }: ToolCallsBlockProps) {
  // Auto-expand when any tool call has an MCP App UI
  const hasMCPApp = toolCalls.some((tc) => tc.mcpAppHtml);
  const [expanded, setExpanded] = useState(hasMCPApp);

  if (toolCalls.length === 0) return null;

  const lastTool = toolCalls[toolCalls.length - 1];
  const latestSummary = getToolSummary(lastTool);
  const allDone = toolCalls.every((tc) => tc.completedAt != null);

  return (
    <div className="mb-3">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-500 transition-colors cursor-pointer group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={cn(
            "size-3 transition-transform",
            expanded && "rotate-90"
          )}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
        <span>
          {!allDone ? (
            <>Using tools...</>
          ) : (
            <>
              Used {toolCalls.length} tool{toolCalls.length > 1 ? "s" : ""}{" "}
              <span className="text-slate-300 mx-0.5">&middot;</span>{" "}
              <span className="text-slate-400/80">
                {truncate(latestSummary, 60)}
              </span>
            </>
          )}
        </span>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-[18px] space-y-2.5">
              {toolCalls.map((tc) => (
                <ToolCallRow key={tc.id} tc={tc} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolCallRow({ tc }: { tc: ToolCallDisplay }) {
  const [resultExpanded, setResultExpanded] = useState(false);
  const label = getToolLabel(tc.name);
  const resultText = tc.result || "";
  const isLongResult = resultText.length > 200;

  // Pick the most meaningful args to show (skip very large ones)
  const displayArgs = Object.entries(tc.arguments).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  ).slice(0, 3);

  return (
    <div className="text-xs text-slate-500">
      <div className="flex items-start gap-1.5">
        <StatusIcon tc={tc} />
        <span className="font-medium text-slate-500">{label}</span>
      </div>

      {/* Input arguments */}
      {displayArgs.length > 0 && (
        <div className="ml-[18px] mt-0.5 space-y-0.5">
          {displayArgs.map(([key, val]) => (
            <div key={key} className="text-slate-400">
              <span className="text-slate-400/70">{key}:</span>{" "}
              {formatArgValue(val)}
            </div>
          ))}
        </div>
      )}

      {/* Output result */}
      {resultText && (
        <div className="ml-[18px] mt-0.5">
          <span className="text-slate-400/70">&rarr;</span>{" "}
          <span className={cn("text-slate-400", tc.success === false && "text-red-400/80")}>
            {isLongResult && !resultExpanded
              ? truncate(resultText, 200)
              : resultText}
          </span>
          {isLongResult && (
            <button
              onClick={() => setResultExpanded(!resultExpanded)}
              className="ml-1 text-slate-400/60 hover:text-slate-500 underline"
            >
              {resultExpanded ? "less" : "more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
