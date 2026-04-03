"use client";

import { McpMemoryVersion } from "@/providers/memories-provider";

interface VersionTimelineProps {
  versions: McpMemoryVersion[];
}

export default function VersionTimeline({ versions }: VersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <p className="text-xs text-(--text-secondary)/50 py-2">
        No version history
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {versions.map((version, idx) => (
        <div key={version.id} className="flex gap-3">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-(--accent)/40 mt-1.5 shrink-0" />
            {idx < versions.length - 1 && (
              <div className="w-px flex-1 bg-(--border-color)/30" />
            )}
          </div>

          {/* Version content */}
          <div className="pb-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-(--text-primary)">
                v{version.version}
              </span>
              {version.changed_by && (
                <span className="text-[10px] px-1.5 py-0.5 bg-black/5 rounded text-(--text-secondary)">
                  {version.changed_by}
                </span>
              )}
              <span className="text-[10px] text-(--text-secondary)/50 ml-auto">
                {new Date(version.created_at).toLocaleString()}
              </span>
            </div>
            {version.change_reason && (
              <p className="text-[11px] text-(--text-secondary) mb-1">
                {version.change_reason}
              </p>
            )}
            <div className="text-xs text-(--text-secondary)/80 bg-black/3 rounded p-2 whitespace-pre-wrap line-clamp-4">
              {version.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
