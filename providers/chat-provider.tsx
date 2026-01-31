"use client";

import { ChatState, Message } from "@/types";
import { createContext, useCallback, useContext, useState } from "react";

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children?: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasStarted = messages.length > 0;

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isLoading) return;

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Simulate AI response (placeholder for actual AI integration)
      setTimeout(() => {
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: getPlaceholderResponse(content),
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 800);
    },
    [isLoading],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        hasStarted,
        isLoading,
        sendMessage,
        clearMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Placeholder responses until AI is integrated
function getPlaceholderResponse(userInput: string): string {
  const input = userInput.toLowerCase();

  if (input.includes("hello") || input.includes("hi")) {
    return "Hello! I'm your AI workspace assistant. How can I help you today?";
  }

  if (input.includes("help")) {
    return "I can help you organize your thoughts, manage tasks, and keep track of projects. Just chat naturally and I'll help structure things as we go.";
  }

  if (input.includes("task") || input.includes("todo")) {
    return "I noticed you mentioned a task. Once we have more context, I can help you organize and track it in the right Space.";
  }

  return "I understand. As we continue our conversation, I'll help identify patterns and structure that emerges naturally. What would you like to explore?";
}
