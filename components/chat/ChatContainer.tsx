"use client";

import { motion, AnimatePresence } from "framer-motion";

import { chatInputTransition } from "@/lib/animations";
import ChatInput from "./ChatInput";
import ChatThread from "./ChatThread";
import WelcomeView from "./WelcomeView";
import { useChat } from "@/providers/chat-provider";

export default function ChatContainer() {
  const { messages, hasStarted, isLoading, sendMessage } = useChat();

  return (
    <div className="h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {hasStarted ? (
            <motion.div
              key="thread"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChatThread messages={messages} isLoading={isLoading} />
            </motion.div>
          ) : (
            <motion.div
              key="welcome"
              className="flex-1 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <WelcomeView onSuggestionClick={sendMessage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area - animates from center to bottom */}
      <motion.div
        className="shrink-0 p-4 pb-6!"
        layout
        initial={false}
        animate={{
          paddingTop: hasStarted ? 34 : 0,
        }}
        transition={chatInputTransition}
      >
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          placeholder={
            hasStarted ? "Continue the conversation..." : "What's on your mind?"
          }
        />
      </motion.div>
    </div>
  );
}
