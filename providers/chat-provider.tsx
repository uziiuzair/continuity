"use client";

import { ActivityState, ChatState, Message } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useThreads } from "./threads-provider";
import { useCanvas } from "./canvas-provider";
import { isTauriContext } from "@/lib/db";
import { createMessage, getMessagesByThread } from "@/lib/db/messages";
import {
  getAIClient,
  ChatMessage as AIChatMessage,
  AITool,
  AIToolCall,
  ChatOptions,
} from "@/lib/ai";
import { getAIConfig } from "@/lib/db/settings";
import {
  CANVAS_TOOLS,
  CANVAS_TOOLS_SYSTEM_PROMPT,
  executeCanvasTool,
  ToolCall,
  ToolDefinition,
} from "@/lib/ai/canvas-tools";
import {
  WEB_TOOLS,
  WEB_TOOL_NAMES,
  WEB_TOOLS_SYSTEM_PROMPT,
  executeWebTool,
} from "@/lib/ai/web-tools";
import {
  MEMORY_TOOLS,
  MEMORY_TOOL_NAMES,
  MEMORY_TOOLS_SYSTEM_PROMPT,
  executeMemoryTool,
} from "@/lib/ai/memory-tools";
import {
  ARTIFACT_TOOLS,
  ARTIFACT_TOOL_NAMES,
  ARTIFACT_TOOLS_SYSTEM_PROMPT,
  executeArtifactTool,
} from "@/lib/ai/artifact-tools";
import {
  DATABASE_TOOLS,
  DATABASE_TOOL_NAMES,
  DATABASE_TOOLS_SYSTEM_PROMPT,
  executeDatabaseTool,
} from "@/lib/ai/database-tools";
import {
  WORK_STATE_TOOLS,
  WORK_STATE_TOOL_NAMES,
  WORK_STATE_TOOLS_SYSTEM_PROMPT,
  executeWorkStateTool,
} from "@/lib/ai/work-state-tools";
import { WORKSPACE_AGENT_PROMPT } from "@/lib/ai/workspace-agent-prompt";

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  loadMessages: (threadId: string) => Promise<void>;

  canvasIsOpen: boolean;
  setCanvasIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Maps tool names to appropriate activity states
 */
function getActivityStateForTool(toolName: string): ActivityState {
  // Searching - web and external lookups
  if (['web_search', 'read_url', 'get_current_time'].includes(toolName)) {
    return 'searching';
  }

  // Saving/Memory operations
  if (['remember_information', 'forget_information'].includes(toolName)) {
    return 'saving';
  }

  // Extracting structure from content
  if ([
    'create_task',
    'create_artifact',
    'add_open_loop',
    'add_blocker',
    'record_decision',
  ].includes(toolName)) {
    return 'extracting';
  }

  // Default: updating workspace (canvas, database, etc.)
  return 'updating';
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// All available tools combined
const ALL_TOOLS: ToolDefinition[] = [
  ...CANVAS_TOOLS,
  ...WEB_TOOLS,
  ...MEMORY_TOOLS,
  ...ARTIFACT_TOOLS,
  ...DATABASE_TOOLS,
  ...WORK_STATE_TOOLS,
];

// Canvas tool names for checking if we need to refresh
const CANVAS_TOOL_NAMES = CANVAS_TOOLS.map((t) => t.name);

// Convert our tool definitions to AI SDK format
function getAllToolsForAI(): AITool[] {
  return ALL_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// Continuity personality prompt
const PERSONALITY_SYSTEM_PROMPT = `You are a thinking partner inside a productivity workspace.

Your purpose is to help the user orient, prioritize, and make progress on what matters to them. You work alongside them, not above them.

## How You Show Up

You are calm, grounded, and practical. You don't perform enthusiasm or inject personality where it doesn't belong. You speak plainly and keep things clear.

When the user is exploring, you explore with them.
When they're deciding, you help them see the trade-offs.
When they're stuck, you help surface what's actually blocking them.
When they're working, you stay out of the way unless asked.

## Orientation Before Action

Before jumping to solutions, help the user understand where they are:
- What's the current situation?
- What matters most right now?
- What can wait?

Don't overwhelm with options. Surface what's relevant.

## Prioritization

Help distinguish between:
- What's important
- What's urgent
- What can wait

Don't create pressure. Don't add to the pile. Help reduce it.

## Communication Style

- Clarity over cleverness
- Short paragraphs over long lists
- Questions when genuinely uncertain, not as a technique
- Plain language, no jargon or hype
- Adapt tone to the task (professional outputs stay professional)

## What You Don't Do

- Motivational speeches
- Excessive validation or praise
- Pretending to be smarter than the user
- Over-explaining or talking down
- Creating urgency that isn't there
- Treating each message as an isolated request

## Continuity

Work unfolds over time. Remember what was discussed, what was decided, what questions remain open, and what comes next. Help the user pick up where they left off.

The goal is steady, clear progress. Not performance.`;

// Combined system prompt for all tools
const COMBINED_TOOLS_SYSTEM_PROMPT = `
${PERSONALITY_SYSTEM_PROMPT}

${WORKSPACE_AGENT_PROMPT}

${CANVAS_TOOLS_SYSTEM_PROMPT}

${WEB_TOOLS_SYSTEM_PROMPT}

${MEMORY_TOOLS_SYSTEM_PROMPT}

${ARTIFACT_TOOLS_SYSTEM_PROMPT}

${DATABASE_TOOLS_SYSTEM_PROMPT}

${WORK_STATE_TOOLS_SYSTEM_PROMPT}
`.trim();

export const ChatProvider = ({ children }: { children?: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activityState, setActivityState] = useState<ActivityState>('idle');
  const [error, setError] = useState<string | undefined>();
  const [canvasIsOpen, setCanvasIsOpen] = useState<boolean>(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  // Derive isLoading for backward compatibility
  const isLoading = activityState !== 'idle';

  const { activeThreadId, createThread, setActiveThread, touchThread } =
    useThreads();

  // Get refresh function from canvas provider (to update UI after DB writes)
  const { refreshContent } = useCanvas();

  // Track whether canvas system prompt has been added
  const canvasSystemPromptAdded = useRef(false);

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

  /**
   * Execute tool calls and return results
   * Routes to the appropriate tool executor based on tool name
   */
  const executeToolCalls = useCallback(
    async (toolCalls: AIToolCall[], threadId: string): Promise<AIChatMessage[]> => {
      const results: AIChatMessage[] = [];

      for (const tc of toolCalls) {
        // Parse the arguments
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }

        const toolCall: ToolCall = {
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        };

        // Route to appropriate tool executor
        let result;
        if (CANVAS_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeCanvasTool(toolCall, threadId);
        } else if (WEB_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeWebTool(toolCall);
        } else if (MEMORY_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeMemoryTool(toolCall);
        } else if (ARTIFACT_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeArtifactTool(toolCall, threadId);
        } else if (DATABASE_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeDatabaseTool(toolCall, threadId);
        } else if (WORK_STATE_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeWorkStateTool(toolCall, threadId);
        } else {
          result = {
            toolCallId: tc.id,
            result: `Unknown tool: ${tc.function.name}`,
            success: false,
          };
        }

        // Add to results
        results.push({
          role: "tool",
          content: result.result,
          toolCallId: tc.id,
        });

        // If a canvas or database tool was executed, refresh the UI
        const canvasModifyingTools = [
          "add_to_canvas",
          "update_block",
          "delete_block",
          "create_database",
          "add_database_row",
          "update_database_row",
        ];
        if (result.success && canvasModifyingTools.includes(tc.function.name)) {
          await refreshContent();
          // Auto-open canvas when content is modified
          if (!canvasIsOpen) {
            setCanvasIsOpen(true);
          }
        }
      }

      return results;
    },
    [refreshContent, canvasIsOpen]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const trimmedContent = content.trim();
      setActivityState('interpreting');
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
          setActivityState('idle');
          return;
        }

        // Get AI client and make request
        const client = await getAIClient();

        if (!client) {
          throw new Error("Failed to initialize AI client");
        }

        // Build messages for AI (include history)
        const aiMessages: AIChatMessage[] = [];

        // Always add combined tools system prompt
        if (!canvasSystemPromptAdded.current) {
          aiMessages.push({
            role: "system",
            content: COMBINED_TOOLS_SYSTEM_PROMPT,
          });
          canvasSystemPromptAdded.current = true;
        }

        // Add conversation history
        aiMessages.push(
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          }))
        );

        // Add current user message
        aiMessages.push({ role: "user" as const, content: trimmedContent });

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

        // Prepare chat options with all tools
        const chatOptions: ChatOptions = {
          tools: getAllToolsForAI(),
          toolChoice: "auto",
        };

        // Tool calling loop - keep calling until no more tool calls
        let currentMessages = [...aiMessages];
        let finalContent = "";
        let response;
        const MAX_TOOL_ITERATIONS = 10; // Safety limit
        let iterations = 0;
        let hasReceivedFirstChunk = false;

        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          // Make the API call
          response = await client.chatStream(
            currentMessages,
            (chunk: string) => {
              // Transition to drafting on first chunk
              if (!hasReceivedFirstChunk) {
                hasReceivedFirstChunk = true;
                setActivityState('drafting');
              }
              finalContent += chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: finalContent }
                    : msg
                )
              );
            },
            chatOptions
          );

          // Check if there are tool calls
          if (response.toolCalls && response.toolCalls.length > 0) {
            // Add assistant message with tool calls to context
            // (OpenAI requires tool_calls to be included in the assistant message)
            currentMessages.push({
              role: "assistant",
              content: response.content || "",
              toolCalls: response.toolCalls,
            });

            // Set activity state based on first tool being called
            const firstToolName = response.toolCalls[0]?.function?.name;
            if (firstToolName) {
              setActivityState(getActivityStateForTool(firstToolName));
            }

            // Execute tool calls
            const toolResults = await executeToolCalls(
              response.toolCalls,
              threadId || ""
            );

            // Add tool results to messages
            currentMessages.push(...toolResults);

            // Clear the streamed content for next iteration
            // (the AI will generate a new response after seeing tool results)
            finalContent = "";
            hasReceivedFirstChunk = false; // Reset for next streaming round
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: "" }
                  : msg
              )
            );
          } else {
            // No more tool calls, we're done
            break;
          }
        }

        setStreamingMessageId(null);

        // Update message with final content and metadata
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: finalContent,
                  metadata: {
                    ...msg.metadata,
                    model: response?.model,
                    tokens: response?.tokens,
                  },
                }
              : msg
          )
        );

        // Save to DB
        if (isTauriContext() && threadId && finalContent) {
          await createMessage(threadId, "assistant", finalContent, {
            model: response?.model,
            provider: aiConfig.provider,
            tokens: response?.tokens,
          });
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
        setActivityState('idle');
      }
    },
    [
      isLoading,
      activeThreadId,
      createThread,
      setActiveThread,
      messages,
      touchThread,
      canvasIsOpen,
      executeToolCalls,
    ]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(undefined);
    setActiveThread(null);
    canvasSystemPromptAdded.current = false;
  }, [setActiveThread]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        hasStarted,
        isLoading,
        activityState,
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
