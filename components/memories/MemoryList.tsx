"use client";

import { useState, useMemo } from "react";
import { McpMemory, MemoryType } from "@/providers/memories-provider";
import MemoryCard from "./MemoryCard";
import { cn } from "@/lib/utils";

interface MemoryListProps {
  memories: McpMemory[];
  selectedId: string | null;
  onSelect: (memory: McpMemory) => void;
}

const TYPE_FILTERS: { value: MemoryType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "decision", label: "Decisions" },
  { value: "preference", label: "Preferences" },
  { value: "context", label: "Context" },
  { value: "constraint", label: "Constraints" },
  { value: "pattern", label: "Patterns" },
];

export default function MemoryList({
  memories,
  selectedId,
  onSelect,
}: MemoryListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");

  const filtered = useMemo(() => {
    let result = memories;

    if (typeFilter !== "all") {
      result = result.filter((m) => m.type === typeFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.key.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          (m.tags && m.tags.toLowerCase().includes(q))
      );
    }

    return result;
  }, [memories, search, typeFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 space-y-2">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--text-secondary)/50"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-black/3 rounded-md border-none outline-none placeholder:text-(--text-secondary)/40 focus:ring-1 focus:ring-(--accent)/30"
          />
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-2 py-0.5 text-xs rounded-full transition-colors",
                typeFilter === f.value
                  ? "bg-(--accent)/10 text-(--accent)"
                  : "bg-black/3 text-(--text-secondary) hover:bg-black/5"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-(--text-secondary)/50 py-8">
            {search || typeFilter !== "all"
              ? "No memories match your filters"
              : "No memories yet"}
          </p>
        ) : (
          filtered.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              isSelected={memory.id === selectedId}
              onClick={() => onSelect(memory)}
            />
          ))
        )}
      </div>
    </div>
  );
}
