"use client";

import { motion } from "framer-motion";
import { messageVariants } from "@/lib/animations";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
    >
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={{
          backgroundColor: isUser ? "var(--user-bubble)" : "var(--assistant-bubble)",
        }}
      >
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <time
          className="block text-xs mt-1"
          style={{ color: "var(--text-secondary)" }}
          dateTime={message.createdAt.toISOString()}
        >
          {formatTime(message.createdAt)}
        </time>
      </div>
    </motion.div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
