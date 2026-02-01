"use client";

import { ChatState, Message } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useThreads } from "./threads-provider";
import { isTauriContext } from "@/lib/db";
import { createMessage, getMessagesByThread } from "@/lib/db/messages";
import { getAIClient, ChatMessage as AIChatMessage } from "@/lib/ai";
import { getAIConfig } from "@/lib/db/settings";

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  loadMessages: (threadId: string) => Promise<void>;

  canvasIsOpen: boolean;
  setCanvasIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children?: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [canvasIsOpen, setCanvasIsOpen] = useState<boolean>(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const { activeThreadId, createThread, setActiveThread, touchThread } =
    useThreads();

  const hasStarted = messages.length > 0;

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  const loadMessages = useCallback(async (threadId: string): Promise<void> => {
    if (!isTauriContext()) return;

    try {
      const loadedMessages = await getMessagesByThread(threadId);
      setMessages(loadedMessages);
      setError(undefined);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load messages");
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const trimmedContent = content.trim();
      setIsLoading(true);
      setError(undefined);

      try {
        let threadId = activeThreadId;

        // Auto-create thread if none active
        if (!threadId && isTauriContext()) {
          const title =
            trimmedContent.length > 30
              ? trimmedContent.slice(0, 30) + "..."
              : trimmedContent;
          const thread = await createThread(title);
          threadId = thread.id;
          setActiveThread(threadId);
        }

        // Create user message
        const userMessage: Message = {
          id: generateId(),
          threadId: threadId || "",
          role: "user",
          content: trimmedContent,
          createdAt: new Date(),
        };

        // Save user message to DB if in Tauri context
        if (isTauriContext() && threadId) {
          await createMessage(threadId, "user", trimmedContent);
        }

        setMessages((prev) => [...prev, userMessage]);

        // Check if AI is configured
        const aiConfig = isTauriContext() ? await getAIConfig() : null;

        if (!aiConfig) {
          // No AI configured - use placeholder
          const assistantMessage: Message = {
            id: generateId(),
            threadId: threadId || "",
            role: "assistant",
            content:
              "To get AI responses, please configure your API key in Settings → API Keys.",
            createdAt: new Date(),
          };

          if (isTauriContext() && threadId) {
            await createMessage(threadId, "assistant", assistantMessage.content);
          }

          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        // Get AI client and make request
        const client = await getAIClient();

        if (!client) {
          throw new Error("Failed to initialize AI client");
        }

        // Build messages for AI (include history)
        const aiMessages: AIChatMessage[] = [
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user" as const, content: trimmedContent },
        ];

        // Create assistant message placeholder for streaming
        const assistantMessageId = generateId();
        const assistantMessage: Message = {
          id: assistantMessageId,
          threadId: threadId || "",
          role: "assistant",
          content: "",
          createdAt: new Date(),
          metadata: {
            provider: aiConfig.provider,
          },
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessageId(assistantMessageId);

        // Stream the response
        const response = await client.chatStream(aiMessages, (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        });

        setStreamingMessageId(null);

        // Update with final metadata
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    model: response.model,
                    tokens: response.tokens,
                  },
                }
              : msg
          )
        );

        // Save to DB
        if (isTauriContext() && threadId) {
          await createMessage(
            threadId,
            "assistant",
            response.content,
            {
              model: response.model,
              provider: aiConfig.provider,
              tokens: response.tokens,
            }
          );
          await touchThread(threadId);
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);

        // Add error message to chat
        const errorAssistantMessage: Message = {
          id: generateId(),
          threadId: activeThreadId || "",
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMessage}`,
          createdAt: new Date(),
          metadata: {
            error: errorMessage,
          },
        };

        setMessages((prev) => [...prev, errorAssistantMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      activeThreadId,
      createThread,
      setActiveThread,
      messages,
      touchThread,
    ]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(undefined);
    setActiveThread(null);
  }, [setActiveThread]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        hasStarted,
        isLoading,
        error,
        sendMessage,
        clearMessages,
        loadMessages,

        canvasIsOpen,
        setCanvasIsOpen,
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
