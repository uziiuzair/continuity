"use client";

import { motion } from "framer-motion";
import { useMemories } from "@/providers/memories-provider";

interface OnboardingViewProps {
  onStartChat: (message: string) => void;
}

const suggestions = [
  {
    text: "I'm working on a project and want to capture my thinking",
    description: "I'll remember this across all your tools",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
      </svg>
    ),
  },
  {
    text: "Help me organize what I'm working on this week",
    description: "I'll track your objectives and next actions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    text: "I just made an important decision I want to remember",
    description: "I'll store this in your knowledge base",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.5 4.5-3 6s-2.5 3.5-4 5c-1.5-1.5-2.5-3.5-4-5s-3-3.5-3-6a7 7 0 0 1 7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
];

export default function OnboardingView({ onStartChat }: OnboardingViewProps) {
  const { memories } = useMemories();
  const memoryCount = memories.length;

  return (
    <motion.div
      className="w-full max-w-xl mx-auto px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-10">
        <motion.h1
          className="text-4xl font-normal mb-3 text-[#3d3d3a]"
          style={{ fontFamily: `var(--font-serif)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Welcome to Continuity<span className="text-(--accent)">.</span>
        </motion.h1>
        <motion.p
          className="text-(--text-secondary) text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {memoryCount > 0
            ? `Your knowledge base has ${memoryCount} memories. Let's keep building.`
            : "Start a conversation to build your knowledge base."
          }
        </motion.p>
        <motion.p
          className="text-(--text-secondary)/60 text-xs mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Everything you discuss is remembered across all your tools.
        </motion.p>
      </div>

      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            onClick={() => onStartChat(suggestion.text)}
            className="w-full p-4 rounded-lg border border-(--border-color)/50 bg-white/50
                       hover:bg-[#f5f4ed] hover:border-(--border-color)
                       transition-all duration-200 text-left group flex items-start gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="w-8 h-8 rounded-md bg-(--accent)/10 flex items-center justify-center shrink-0 mt-0.5 text-(--accent) group-hover:bg-(--accent)/15 transition-colors">
              {suggestion.icon}
            </div>
            <div>
              <span className="block text-sm font-medium text-[#3d3d3a] group-hover:text-(--accent) transition-colors">
                {suggestion.text}
              </span>
              <span className="block text-xs text-(--text-secondary)/70 mt-0.5">
                {suggestion.description}
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
