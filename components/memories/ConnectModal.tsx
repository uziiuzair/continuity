"use client";

import { useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tool = "claude-code" | "cursor" | "windsurf";

const TOOLS: { id: Tool; name: string; icon: string }[] = [
  { id: "claude-code", name: "Claude Code", icon: "C" },
  { id: "cursor", name: "Cursor", icon: "Cu" },
  { id: "windsurf", name: "Windsurf", icon: "W" },
];

function getConfig(tool: Tool): { filename: string; config: string; instructions: string[] } {
  const config = {
    mcpServers: {
      continuity: {
        command: "npx",
        args: ["continuity-memory"],
      },
    },
  };

  const configStr = JSON.stringify(config, null, 2);

  switch (tool) {
    case "claude-code":
      return {
        filename: ".mcp.json",
        config: configStr,
        instructions: [
          "Create a .mcp.json file in your project root (or ~/.claude/ for global)",
          "Paste the configuration below",
          "Restart Claude Code — the 12 memory tools will appear automatically",
          "Try: \"Remember that this project uses Express + MongoDB\"",
        ],
      };
    case "cursor":
      return {
        filename: ".cursor/mcp.json",
        config: configStr,
        instructions: [
          "Create a .cursor/mcp.json file in your project root",
          "Paste the configuration below",
          "Restart Cursor — memory tools will be available in Composer",
          "Memories persist across sessions and are shared with other tools",
        ],
      };
    case "windsurf":
      return {
        filename: "~/.codeium/windsurf/mcp_config.json",
        config: configStr,
        instructions: [
          "Open or create ~/.codeium/windsurf/mcp_config.json",
          "Paste the configuration below",
          "Restart Windsurf — memory tools appear in Cascade",
          "All memories are shared across tools via the same SQLite database",
        ],
      };
  }
}

export default function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const [activeTool, setActiveTool] = useState<Tool>("claude-code");
  const [copied, setCopied] = useState(false);

  const { filename, config, instructions } = getConfig(activeTool);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={onClose}
          className="relative z-50"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-lg"
            >
              <DialogPanel className="bg-(--background-color) rounded-lg shadow-xl border border-(--border-color) overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-color)">
                  <div>
                    <h2
                      className="text-lg text-(--text-primary)"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      Connect an AI Tool
                    </h2>
                    <p className="text-xs text-(--text-secondary) mt-0.5">
                      Add the MCP server to your AI tool to enable persistent memory
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
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

                {/* Tool selector */}
                <div className="px-5 pt-4">
                  <div className="flex gap-2">
                    {TOOLS.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors flex-1",
                          activeTool === tool.id
                            ? "bg-black/5 text-(--text-primary) font-medium ring-1 ring-black/10"
                            : "text-(--text-secondary) hover:bg-black/3"
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold",
                            activeTool === tool.id
                              ? "bg-(--text-primary) text-(--background-color)"
                              : "bg-black/10 text-(--text-secondary)"
                          )}
                        >
                          {tool.icon}
                        </span>
                        {tool.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div className="px-5 pt-4">
                  <ol className="space-y-2">
                    {instructions.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-2.5 text-sm text-(--text-secondary)"
                      >
                        <span className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-medium text-(--text-secondary) shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Config block */}
                <div className="px-5 py-4">
                  <div className="relative">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] rounded-t-lg border border-b-0 border-[#333]">
                      <span className="text-[11px] text-[#888] font-mono">
                        {filename}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[11px] text-[#888] hover:text-white transition-colors"
                      >
                        {copied ? (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="size-3 text-green-400"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m4.5 12.75 6 6 9-13.5"
                              />
                            </svg>
                            Copied
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="size-3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                              />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-[#1e1e1e] rounded-b-lg border border-t-0 border-[#333] p-3 overflow-x-auto text-[12px] leading-relaxed font-mono text-[#d4d4d4]">
                      {config}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-4">
                  <div className="flex items-start gap-2 p-3 bg-amber-50/50 rounded-md border border-amber-200/50">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-4 text-amber-500 shrink-0 mt-0.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                      />
                    </svg>
                    <p className="text-xs text-amber-700">
                      All connected tools share the same memory database. A memory written by Claude Code
                      is instantly readable by Cursor, Windsurf, and this dashboard.
                    </p>
                  </div>
                </div>
              </DialogPanel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
