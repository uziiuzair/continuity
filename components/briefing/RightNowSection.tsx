"use client";

import { motion } from "framer-motion";
import { ActiveThread } from "@/types/briefing";
import ThreadCard from "./ThreadCard";

interface RightNowSectionProps {
  threads: ActiveThread[];
  onThreadClick: (threadId: string) => void;
}

export default function RightNowSection({
  threads,
  onThreadClick,
}: RightNowSectionProps) {
  if (threads.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xs font-medium text-(--text-secondary)/60 uppercase tracking-wide mb-3">
        Right Now
      </h2>

      <div className="space-y-2">
        {threads.map((thread, index) => (
          <motion.div
            key={thread.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ThreadCard
              thread={thread}
              onClick={() => onThreadClick(thread.id)}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
