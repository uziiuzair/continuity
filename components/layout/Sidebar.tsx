"use client";

import { motion } from "framer-motion";
import { sidebarVariants, sidebarContentVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  return (
    <motion.aside
      className={cn(
        "h-screen flex flex-col border-r shrink-0 transition-all duration-300 bg-(--background-color) overflow-x-hidden z-50",
        isExpanded ? "border-(--border-color)!" : "border-transparent",
      )}
      variants={sidebarVariants}
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      {/* Header with toggle */}
      <div className="h-14 flex items-center justify-end px-4">
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

      {/* Navigation placeholder */}
      <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        <motion.div
          variants={sidebarContentVariants}
          animate={isExpanded ? "expanded" : "collapsed"}
        >
          <div className="space-y-1">
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
            />
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
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
                  />
                </svg>
              }
              label="Threads"
            />
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
                    d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                  />
                </svg>
              }
              label="Projects"
            />
          </div>
        </motion.div>
      </nav>
    </motion.aside>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors whitespace-nowrap hover:bg-[#f5f4ed]",
      )}
    >
      {icon && <span className="text-(--text-secondary)/50">{icon}</span>}
      <span className="text-sm text-(--text-primary)">{label}</span>
    </div>
  );
}
