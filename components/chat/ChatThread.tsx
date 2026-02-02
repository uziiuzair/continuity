"use client";

import { useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";
import type { Message } from "@/types";

interface ChatThreadProps {
  messages: Message[];
}

export default function ChatThread({ messages }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
