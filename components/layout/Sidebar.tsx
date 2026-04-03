"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { sidebarVariants, sidebarContentVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";
import Settings from "@/components/settings";
import { useThreads } from "@/providers/threads-provider";
import { useChat } from "@/providers/chat-provider";

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [threadsExpanded, setThreadsExpanded] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  const { threads, activeThreadId, setActiveThread, archiveThread } =
    useThreads();
  const { clearMessages } = useChat();

  const handleNewChat = () => {
    clearMessages();
    // Navigate to home if on another page
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleJournalClick = () => {
    router.push("/journal");
  };

  const handleMemoriesClick = () => {
    router.push("/memories");
  };

  const handleThreadClick = (threadId: string) => {
    setActiveThread(threadId);
  };

  const handleArchiveThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    await archiveThread(threadId);
  };

  return (
    <motion.aside
      className={cn(
        "h-screen flex bg-[#f7f6f2] flex-col border-r shrink-0 transition-all duration-300 overflow-x-hidden z-50",
        isExpanded ? "border-(--border-color)/50!" : "border-transparent",
      )}
      variants={sidebarVariants}
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      {/* Header with toggle */}
      <div className="h-14 flex items-center justify-between px-4">
        <AnimatePresence>
          {isExpanded && (
            <motion.h1
              className="text-2xl text-black"
              style={{
                fontFamily: `var(--font-serif)`,
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.1 }}
            >
              Continuity
            </motion.h1>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 transition-colors cursor-pointer"
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
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
            style={{
              transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.3s ease",
            }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        <motion.div
          variants={sidebarContentVariants}
          animate={isExpanded ? "expanded" : "collapsed"}
        >
          <div className="space-y-1">
            {/* New Chat */}
            <NavItem
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              }
              label="New Chat"
              onClick={handleNewChat}
            />

            {/* Daily Journals */}
            <NavItem
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="size-4.5"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M21 8H3m13-6v3M8 2v3m-.2 17h8.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 19.72 21 18.88 21 17.2V8.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C18.72 4 17.88 4 16.2 4H7.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C3 6.28 3 7.12 3 8.8v8.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C5.28 22 6.12 22 7.8 22m4.197-9.67c-.8-.908-2.133-1.153-3.135-.32-1.002.832-1.143 2.223-.356 3.208.571.715 2.153 2.122 2.977 2.839.179.155.268.233.373.264.09.027.192.027.283 0 .104-.03.194-.109.372-.264.824-.717 2.407-2.124 2.978-2.84a2.256 2.256 0 0 0-.356-3.208c-1.02-.823-2.336-.587-3.136.322Z"
                  />
                </svg>
              }
              label="Daily Journals"
              active={pathname === "/journal"}
              onClick={handleJournalClick}
            />

            {/* Memories */}
            <NavItem
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                  />
                </svg>
              }
              label="Memories"
              active={pathname.startsWith("/memories")}
              onClick={handleMemoriesClick}
            />

            {/* Threads section */}
            <div className="mt-4">
              <button
                onClick={() => setThreadsExpanded(!threadsExpanded)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) uppercase tracking-wider hover:text-(--text-primary) transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={cn(
                    "size-3 transition-transform",
                    threadsExpanded && "rotate-90",
                  )}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
                Threads
              </button>

              <AnimatePresence>
                {threadsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {threads.length === 0 ? (
                      <p className="px-2.5 py-2 text-xs text-(--text-secondary)/50">
                        No threads yet
                      </p>
                    ) : (
                      <div className="mt-1 space-y-0.5">
                        {threads.map((thread) => (
                          <ThreadItem
                            key={thread.id}
                            title={thread.title}
                            isActive={thread.id === activeThreadId}
                            onClick={() => {
                              router.push("/");
                              handleThreadClick(thread.id);
                            }}
                            onArchive={(e) => handleArchiveThread(e, thread.id)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </nav>

      {/* Footer with Settings */}
      <div className="p-3 border-t border-(--border-color)">
        <motion.div
          variants={sidebarContentVariants}
          animate={isExpanded ? "expanded" : "collapsed"}
        >
          <NavItem
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            }
            label="Settings"
            onClick={() => setSettingsOpen(true)}
          />
        </motion.div>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </motion.aside>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap hover:bg-[#f5f4ed]",
        active && "bg-[#f5f4ed]",
      )}
    >
      {icon && <span className="text-(--text-secondary)/50">{icon}</span>}
      <span className="text-sm text-(--text-primary)">{label}</span>
    </button>
  );
}

function ThreadItem({
  title,
  isActive,
  onClick,
  onArchive,
}: {
  title: string;
  isActive: boolean;
  onClick: () => void;
  onArchive: (e: React.MouseEvent) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={cn(
        "w-full flex h-8 items-center justify-between gap-2 pl-6 pr-2.5 py-1.5 rounded-md cursor-pointer transition-colors group",
        isActive ? "bg-[#f5f4ed]" : "hover:bg-[#f5f4ed]/50",
      )}
    >
      <span className="text-sm text-(--text-primary) truncate">{title}</span>
      <AnimatePresence>
        {showActions && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            onClick={onArchive}
            className="p-1 rounded hover:bg-(--accent)/10 text-(--text-secondary) hover:text-(--accent) transition-colors"
            title="Archive thread"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              className="size-4.5"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20 9-1.995 11.346A2 2 0 0 1 16.035 22h-8.07a2 2 0 0 1-1.97-1.654L4 9m17-3h-5.625M3 6h5.625m0 0V4a2 2 0 0 1 2-2h2.75a2 2 0 0 1 2 2v2m-6.75 0h6.75"
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
