"use client";

import { motion } from "framer-motion";
import { welcomeVariants } from "@/lib/animations";

interface WelcomeViewProps {
  onSuggestionClick?: (suggestion: string) => void;
}

const suggestions = [
  "What are you working on today?",
  "Help me organize my thoughts",
  "I have a new project idea",
];

export default function WelcomeView({ onSuggestionClick }: WelcomeViewProps) {
  return (
    <motion.div
      className="text-center px-4"
      variants={welcomeVariants}
      initial="visible"
      exit="hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <h1
          className="text-5xl font-normal mb-3 text-[#3d3d3a]"
          style={{ fontFamily: `var(--font-serif)` }}
        >
          Welcome to Continuity<span className="text-(--accent)">.</span>
        </h1>
        <p className="text-sm mb-8 text-(--text-secondary)/80">
          Your local-first AI workspace. Just start chatting.
        </p>
      </motion.div>

      {onSuggestionClick && (
        <motion.div
          className="flex flex-wrap justify-center gap-4 w-full mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-6 py-1.5 rounded-full text-sm border transition-all duration-300 hover:bg-[#f5f4ed] border-(--border-color)/50 text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-(--accent)"
            >
              {suggestion}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
