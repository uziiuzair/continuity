"use client";

import { useState } from "react";
import { useMemories, McpMemory } from "@/providers/memories-provider";
import MemoryList from "./MemoryList";
import MemoryDetail from "./MemoryDetail";
import ProjectMemories from "./ProjectMemories";
import ConnectModal from "./ConnectModal";
import { cn } from "@/lib/utils";

type Tab = "global" | "projects";

export default function MemoriesPage() {
  const { memories, projects, isLoading, error, refresh } = useMemories();
  const [activeTab, setActiveTab] = useState<Tab>("global");
  const [selectedMemory, setSelectedMemory] = useState<McpMemory | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const globalMemories = memories.filter((m) => m.scope === "global");
  const projectMemories = memories.filter((m) => m.scope === "project");

  if (error && memories.length === 0) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6 text-amber-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-(--text-primary) mb-2">
              No memories yet
            </h2>
            <p className="text-sm text-(--text-secondary) mb-4">
              Memories will appear here once an AI tool writes to the Continuity MCP
              server. Connect Claude Code, Cursor, or any MCP-compatible tool to get
              started.
            </p>
            <button
              onClick={() => setConnectOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-(--text-primary) text-(--background-color) hover:opacity-90 transition-opacity"
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
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
              Connect an AI Tool
            </button>
          </div>
        </div>
        <ConnectModal isOpen={connectOpen} onClose={() => setConnectOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-(--border-color)/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-2xl text-(--text-primary)"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Memories
            </h1>
            <p className="text-sm text-(--text-secondary) mt-1">
              {memories.length} memories across {projects.length} projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConnectOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-(--text-primary) text-(--background-color) hover:opacity-90 transition-opacity"
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
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
              Connect
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={cn("size-4", isLoading && "animate-spin")}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <TabButton
            active={activeTab === "global"}
            onClick={() => {
              setActiveTab("global");
              setSelectedMemory(null);
            }}
            count={globalMemories.length}
          >
            Global
          </TabButton>
          <TabButton
            active={activeTab === "projects"}
            onClick={() => {
              setActiveTab("projects");
              setSelectedMemory(null);
            }}
            count={projectMemories.length}
          >
            By Project
          </TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-[360px] border-r border-(--border-color)/50 overflow-y-auto">
          {activeTab === "global" ? (
            <MemoryList
              memories={globalMemories}
              selectedId={selectedMemory?.id || null}
              onSelect={setSelectedMemory}
            />
          ) : (
            <ProjectMemories
              projects={projects}
              memories={projectMemories}
              selectedId={selectedMemory?.id || null}
              onSelect={setSelectedMemory}
            />
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedMemory ? (
            <MemoryDetail memory={selectedMemory} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-(--text-secondary)">
              Select a memory to view details
            </div>
          )}
        </div>
      </div>

      <ConnectModal isOpen={connectOpen} onClose={() => setConnectOpen(false)} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-sm rounded-md transition-colors",
        active
          ? "bg-black/5 text-(--text-primary) font-medium"
          : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-black/3"
      )}
    >
      {children}
      <span
        className={cn(
          "ml-1.5 text-xs",
          active ? "text-(--text-secondary)" : "text-(--text-secondary)/50"
        )}
      >
        {count}
      </span>
    </button>
  );
}
