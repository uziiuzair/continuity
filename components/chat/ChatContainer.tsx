"use client";

import { motion, AnimatePresence } from "framer-motion";

import { chatInputTransition } from "@/lib/animations";
import ActivityIndicator from "./ActivityIndicator";
import ChatInput from "./ChatInput";
import ChatThread from "./ChatThread";
import { HomeBriefingView } from "@/components/briefing";
import { useChat } from "@/providers/chat-provider";
import { useThreads } from "@/providers/threads-provider";

export default function ChatContainer() {
  const { messages, hasStarted, activityState, sendMessage, startResearch } = useChat();
  const { setActiveThread } = useThreads();

  const handleThreadClick = (threadId: string) => {
    setActiveThread(threadId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-center min-h-0 ">
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
              <ChatThread messages={messages} />
            </motion.div>
          ) : (
            <div className="flex items-center justify-center overflow-y-auto">
              <motion.div
                key="briefing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <HomeBriefingView
                  onThreadClick={handleThreadClick}
                  onStartChat={sendMessage}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area with activity indicator above */}
      <motion.div
        className="shrink-0 p-4 pb-6!"
        layout
        initial={false}
        animate={{
          paddingTop: hasStarted ? 34 : 0,
        }}
        transition={chatInputTransition}
      >
        {/* Activity indicator - fixed above input */}
        <div className="flex w-full max-w-3xl mx-auto justify-start">
          <AnimatePresence>
            {activityState !== "idle" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-2"
              >
                <ActivityIndicator state={activityState} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ChatInput
          onSend={sendMessage}
          onResearch={startResearch}
          activityState={activityState}
          placeholder={
            hasStarted ? "Continue the conversation..." : "What's on your mind?"
          }
        />
      </motion.div>
    </div>
  );
}
