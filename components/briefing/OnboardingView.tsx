"use client";

import { motion } from "framer-motion";

interface OnboardingViewProps {
  onStartChat: (message: string) => void;
}

const suggestions = [
  {
    text: "I'm planning a project",
    description: "Get help organizing your work",
  },
  {
    text: "I need to organize tasks",
    description: "Create a task list from conversation",
  },
  {
    text: "Just exploring",
    description: "See what Continuity can do",
  },
];

export default function OnboardingView({ onStartChat }: OnboardingViewProps) {
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
          What are you working on?
        </motion.p>
        <motion.p
          className="text-(--text-secondary)/60 text-xs mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Start a conversation and I'll help you stay organized.
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
                       transition-all duration-200 text-left group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="block text-sm font-medium text-[#3d3d3a] group-hover:text-(--accent) transition-colors">
              {suggestion.text}
            </span>
            <span className="block text-xs text-(--text-secondary)/70 mt-0.5">
              {suggestion.description}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
