"use client";

import { useState } from "react";
import { useDeveloperMode } from "@/providers/developer-provider";
import { Switch } from "@headlessui/react";
import { cn } from "@/lib/utils";
import DatabaseModal from "../DatabaseModal";

export default function DeveloperPanel() {
  const { isDeveloperMode, toggleDeveloperMode } = useDeveloperMode();
  const [databaseModalOpen, setDatabaseModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          Developer Settings
        </h3>
        <p className="text-sm text-(--text-secondary)">
          Tools and features for development and debugging.
        </p>
      </div>

      {/* Developer Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-black/[0.02] rounded-lg border border-(--border-color)">
        <div className="space-y-1">
          <div className="text-sm font-medium text-(--text-primary)">
            Developer Mode
          </div>
          <div className="text-xs text-(--text-secondary)">
            Enable developer features like the database viewer and debug tools.
          </div>
        </div>
        <Switch
          checked={isDeveloperMode}
          onChange={toggleDeveloperMode}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            isDeveloperMode ? "bg-(--accent)" : "bg-(--border-color)",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
              isDeveloperMode ? "translate-x-6" : "translate-x-1",
            )}
          />
        </Switch>
      </div>

      {/* Developer Tools (only shown when developer mode is enabled) */}
      {isDeveloperMode && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-(--text-primary)">
            Developer Tools
          </h4>

          {/* Database Browser Button */}
          <button
            onClick={() => setDatabaseModalOpen(true)}
            className="w-full flex items-center gap-3 p-4 bg-black/[0.02] rounded-lg border border-(--border-color) hover:bg-black/[0.04] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-(--accent)/10 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-(--accent)"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-(--text-primary)">
                Database Browser
              </div>
              <div className="text-xs text-(--text-secondary)">
                View tables, columns, and data in your local SQLite database
              </div>
            </div>
            <svg
              className="w-5 h-5 text-(--text-secondary)/50 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Database Modal */}
      <DatabaseModal
        isOpen={databaseModalOpen}
        onClose={() => setDatabaseModalOpen(false)}
      />
    </div>
  );
}
