"use client";

import { ActivityState } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_TEXT: Record<ActivityState, string> = {
  idle: "",
  interpreting: "Making sense of the context",
  extracting: "Pulling out key items",
  updating: "Updating your workspace",
  searching: "Checking sources",
  saving: "Saving progress",
  drafting: "Writing the response",
  waiting: "Waiting",
};

interface ActivityIndicatorProps {
  state: ActivityState;
}

export default function ActivityIndicator({ state }: ActivityIndicatorProps) {
  if (state === "idle") return null;

  const text = STATUS_TEXT[state];

  return (
    <div className="h-6 flex items-center justify-center text-sm">
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
          }}
          className="shimmer-text"
        >
          {text}
        </motion.span>
      </AnimatePresence>

      <style jsx global>{`
        .shimmer-text {
          background: linear-gradient(
            90deg,
            var(--color-slate-400) 0%,
            var(--color-slate-400) 25%,
            var(--accent) 50%,
            var(--color-slate-400) 75%,
            var(--color-slate-400) 100%
          );
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2.5s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 100% 50%;
          }
          100% {
            background-position: -100% 50%;
          }
        }
      `}</style>
    </div>
  );
}
