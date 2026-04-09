"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import { Canvas } from "@/components/canvas";
import { useView } from "@/providers/view-provider";
import { useDatabase } from "@/providers/database-provider";
import { useOnboarding } from "@/providers/onboarding-provider";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import PluginPanel from "@/components/plugins/PluginPanel";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { view, sidebarExpanded, setSidebarExpanded } = useView();
  const { mcpAutoConfigured, dismissMcpNotice } = useDatabase();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();
  const pathname = usePathname();

  // Show onboarding flow if not complete
  if (!onboardingLoading && !isOnboardingComplete) {
    return <OnboardingFlow />;
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
        <main className="flex-1 overflow-hidden">
          {typeof view === "string" && view.startsWith("plugin:") ? (
            <PluginPanel pluginId={view.slice("plugin:".length)} />
          ) : (
            children
          )}
        </main>
        <Canvas />
      </div>

      {/* MCP auto-setup toast */}
      <AnimatePresence>
        {mcpAutoConfigured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1e1e1e] text-white rounded-lg shadow-xl border border-white/10">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="size-4 text-green-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">
                  Memory server connected to Claude Code
                </p>
                <p className="text-xs text-white/50">
                  Restart Claude Code to enable 12 memory tools
                </p>
              </div>
              <button
                onClick={dismissMcpNotice}
                className="ml-2 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors shrink-0"
              >
                <svg
                  width="14"
                  height="14"
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
