"use client";

import { ActivityState, ChatState, Message, ToolCallDisplay } from "@/types";
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
import { getAIConfig, getSetting } from "@/lib/db/settings";
import {
  CANVAS_TOOLS,
  CANVAS_TOOLS_SYSTEM_PROMPT,
  executeCanvasTool,
  shouldIncludeCanvasTools,
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
  getMemoryContext,
} from "@/lib/ai/memory-tools";
import {
  getNarrativeForPrompt,
  scheduleSynthesisCheck,
} from "@/lib/ai/narrative-synthesis";
// Old artifact, database, and work-state tools removed — replaced by unified MCP memory system
import {
  RESEARCH_TOOLS,
  RESEARCH_TOOL_NAMES,
  RESEARCH_TOOLS_SYSTEM_PROMPT,
} from "@/lib/ai/research-tools";
import {
  getMCPToolDefinitions,
  getMCPToolNames,
  getMCPToolsSystemPrompt,
  executeMCPTool,
  getMCPToolUIResourceUri,
  getServerIdFromQualifiedName,
  fetchMCPAppHtml,
} from "@/lib/ai/mcp-tools";
import {
  getPluginToolDefinitions,
  isPluginTool,
  executePluginTool,
  getPluginToolsSystemPrompt,
} from "@/lib/ai/plugin-tools";
import {
  OBSIDIAN_TOOLS,
  OBSIDIAN_TOOL_NAMES,
  executeObsidianTool,
  getObsidianToolsSystemPrompt,
} from "@/lib/ai/obsidian-tools";
import { isVaultConnected } from "@/lib/vault/config";
import { MCPManager } from "@/lib/mcp/manager";
import { runResearch } from "@/lib/ai/research-engine";
import { getSearchProvider } from "@/lib/ai/search-provider";
import { ResearchState } from "@/types/research";
import { SimpleBlock } from "@/lib/canvas";
import { appendCanvasBlocks } from "@/lib/db/canvas";
import { WORKSPACE_AGENT_PROMPT } from "@/lib/ai/workspace-agent-prompt";

interface ChatContextType extends ChatState {
  sendMessage: (content: string) => void;
  clearMessages: () => void;
  loadMessages: (threadId: string) => Promise<void>;
  startResearch: (question: string) => void;

  canvasIsOpen: boolean;
  setCanvasIsOpen: React.Dispatch<React.SetStateAction<boolean>>;

  researchState: ResearchState;
  cancelResearch: () => void;
}

/**
 * Maps tool names to appropriate activity states
 */
function getActivityStateForTool(toolName: string): ActivityState {
  // Deep research
  if (toolName === 'deep_research') {
    return 'researching';
  }

  // Searching - web and external lookups
  if (['web_search', 'read_url', 'get_current_time'].includes(toolName)) {
    return 'searching';
  }

  // Obsidian vault operations
  if (OBSIDIAN_TOOL_NAMES.includes(toolName)) {
    return toolName === 'write_to_obsidian' ? 'saving' : 'searching';
  }

  // Saving/Memory operations
  if (['remember', 'forget', 'remember_information', 'forget_information'].includes(toolName)) {
    return 'saving';
  }

  // MCP external tools
  if (getMCPToolNames().includes(toolName)) {
    return 'mcp-calling';
  }

  // Plugin tools
  if (isPluginTool(toolName)) {
    return 'mcp-calling'; // reuse the same activity state
  }

  // Default: updating workspace (canvas, database, etc.)
  return 'updating';
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Non-canvas built-in tools (always included)
const BASE_TOOLS: ToolDefinition[] = [
  ...WEB_TOOLS,
  ...MEMORY_TOOLS,
  ...RESEARCH_TOOLS,
];

// Canvas tool names for checking if we need to refresh
const CANVAS_TOOL_NAMES = CANVAS_TOOLS.map((t) => t.name);

// Track whether obsidian vault is connected (cached per session, refreshed on prompt rebuild)
let _vaultConnected = false;

// Get all tools including dynamic MCP tools, conditionally including canvas and obsidian
function getAllTools(includeCanvas: boolean): ToolDefinition[] {
  const tools = includeCanvas
    ? [...CANVAS_TOOLS, ...BASE_TOOLS]
    : [...BASE_TOOLS];
  // Include Obsidian tools only when vault is connected
  if (_vaultConnected) {
    tools.push(...OBSIDIAN_TOOLS);
  }
  return [...tools, ...getMCPToolDefinitions(), ...getPluginToolDefinitions()];
}

// Convert our tool definitions to AI SDK format
function getAllToolsForAI(includeCanvas: boolean): AITool[] {
  return getAllTools(includeCanvas).map((tool) => ({
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

// Build system prompt dynamically (includes MCP tools and Obsidian when available)
async function buildSystemPrompt(includeCanvas: boolean): Promise<string> {
  // Check vault connection status and cache it for tool inclusion
  if (isTauriContext()) {
    try {
      _vaultConnected = await isVaultConnected();
    } catch {
      _vaultConnected = false;
    }
  }

  // Load user profile for personalization
  let userProfilePrompt = "";
  if (isTauriContext()) {
    try {
      const [nickname, occupation, about, customInstructions] =
        await Promise.all([
          getSetting("user_nickname"),
          getSetting("user_occupation"),
          getSetting("user_about"),
          getSetting("user_custom_instructions"),
        ]);

      const profileParts: string[] = [];
      if (nickname) profileParts.push(`- Name: ${nickname}`);
      if (occupation) profileParts.push(`- Occupation: ${occupation}`);
      if (about) profileParts.push(`- About: ${about}`);

      if (profileParts.length > 0 || customInstructions) {
        const sections: string[] = [];
        if (profileParts.length > 0) {
          sections.push(
            `## About the User\n\n${profileParts.join("\n")}`,
          );
        }
        if (customInstructions) {
          sections.push(
            `## Custom Instructions\n\n${customInstructions}`,
          );
        }
        userProfilePrompt = sections.join("\n\n");
      }
    } catch {
      // Non-critical — profile can fail silently
    }
  }

  // Load stored memories for passive injection into system prompt
  let memoryContextPrompt = "";
  if (isTauriContext()) {
    try {
      const memCtx = await getMemoryContext();
      if (memCtx) memoryContextPrompt = memCtx;
    } catch {
      // Non-critical — memory context can fail silently
    }
  }

  // Load synthesized narrative (Layer 2 — the AI's mental model of this user)
  let narrativePrompt = "";
  if (isTauriContext()) {
    try {
      const narrative = await getNarrativeForPrompt();
      if (narrative) {
        narrativePrompt = [
          "## What I Know About You",
          "",
          narrative.content,
          "",
          `_(Understanding confidence: ${Math.round(narrative.confidence * 100)}% | v${narrative.version} | Last updated: ${new Date(narrative.lastSynthesized).toLocaleDateString()})_`,
        ].join("\n");
      }
    } catch {
      // Non-critical — narrative can fail silently
    }
  }

  const mcpPrompt = getMCPToolsSystemPrompt();
  const parts = [
    PERSONALITY_SYSTEM_PROMPT,
    ...(userProfilePrompt ? [userProfilePrompt] : []),
    ...(narrativePrompt ? [narrativePrompt] : []),
    ...(memoryContextPrompt ? [memoryContextPrompt] : []),
    WORKSPACE_AGENT_PROMPT,
    ...(includeCanvas ? [CANVAS_TOOLS_SYSTEM_PROMPT] : []),
    WEB_TOOLS_SYSTEM_PROMPT,
    MEMORY_TOOLS_SYSTEM_PROMPT,
    RESEARCH_TOOLS_SYSTEM_PROMPT,
  ];
  if (mcpPrompt) {
    parts.push(mcpPrompt);
  }

  const pluginPrompt = getPluginToolsSystemPrompt();
  if (pluginPrompt) {
    parts.push(pluginPrompt);
  }

  // Add Obsidian vault context if connected
  if (_vaultConnected) {
    try {
      const obsidianPrompt = await getObsidianToolsSystemPrompt();
      if (obsidianPrompt) {
        parts.push(obsidianPrompt);
      }
    } catch {
      // Non-critical — vault prompt can fail silently
    }
  }

  return parts.join("\n\n").trim();
}

const INITIAL_RESEARCH_STATE: ResearchState = {
  isActive: false,
  progress: null,
  result: null,
  error: null,
  messageId: null,
};

export const ChatProvider = ({ children }: { children?: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activityState, setActivityState] = useState<ActivityState>('idle');
  const [error, setError] = useState<string | undefined>();
  const [canvasIsOpen, setCanvasIsOpen] = useState<boolean>(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [researchState, setResearchState] = useState<ResearchState>(INITIAL_RESEARCH_STATE);

  // Derive isLoading for backward compatibility
  const isLoading = activityState !== 'idle';

  const { activeThreadId, createThread, setActiveThread, touchThread } =
    useThreads();
  // Get refresh function and content from canvas provider
  const { refreshContent, content: canvasContent } = useCanvas();

  // Research cancellation ref
  const researchCancelledRef = useRef(false);

  const hasStarted = messages.length > 0;

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  // Cancel research if thread changes
  useEffect(() => {
    if (researchState.isActive) {
      researchCancelledRef.current = true;
      setResearchState(INITIAL_RESEARCH_STATE);
      setActivityState('idle');
    }
  }, [activeThreadId]);

  // Subscribe to MCP tool changes (no-op needed now since system prompt is rebuilt each message)
  // Keeping the subscription so MCP tool definitions are always current
  useEffect(() => {
    if (!isTauriContext()) return;
    const manager = MCPManager.getInstance();
    const unsubscribe = manager.subscribe(() => {
      // MCP tools are fetched dynamically in getAllTools(), no action needed
    });
    return unsubscribe;
  }, []);

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
        if (RESEARCH_TOOL_NAMES.includes(tc.function.name)) {
          // Deep research — handled async, return immediately
          const researchArgs = args as { question: string; context?: string };
          const searchProvider = await getSearchProvider();
          if (!searchProvider) {
            result = {
              toolCallId: tc.id,
              result: "No search provider configured. Please add a Perplexity or Tavily API key in Settings > API Keys.",
              success: false,
            };
          } else {
            const client = await getAIClient();
            if (!client) {
              result = {
                toolCallId: tc.id,
                result: "AI client not available.",
                success: false,
              };
            } else {
              // Start research asynchronously
              researchCancelledRef.current = false;
              setResearchState({
                isActive: true,
                progress: null,
                result: null,
                error: null,
                messageId: null,
              });
              setActivityState('researching');

              // Fire and forget — research engine manages its own lifecycle
              runResearch(
                researchArgs.question,
                researchArgs.context || "",
                client,
                searchProvider,
                {
                  onProgress: (progress) => {
                    setResearchState((prev) => ({ ...prev, progress }));
                  },
                  onComplete: async (researchResult) => {
                    // Write report to canvas
                    if (threadId) {
                      try {
                        const blocks = markdownToSimpleBlocks(researchResult.report);
                        await appendCanvasBlocks(threadId, blocks);
                        await refreshContent();
                        setCanvasIsOpen(true);
                      } catch (err) {
                        console.error("Failed to write research report to canvas:", err);
                      }
                    }

                    // Save summary as assistant message
                    if (isTauriContext() && threadId) {
                      const summaryBody = researchResult.summary + `\n\n*Full report written to canvas. ${researchResult.totalSearches} searches, ${researchResult.totalUrlsRead} sources read, ${Math.round(researchResult.elapsedMs / 1000)}s elapsed.*`;

                      // Update the assistant message in UI, preserving any thinking block
                      setMessages((prev) => {
                        const lastAssistantIdx = prev.length - 1;
                        if (lastAssistantIdx >= 0 && prev[lastAssistantIdx].role === "assistant") {
                          const updated = [...prev];
                          const existingContent = updated[lastAssistantIdx].content;
                          // Preserve the :::thinking block if present
                          const thinkingMatch = existingContent.match(/^:::thinking\n[\s\S]*?\n:::/);
                          const thinkingPrefix = thinkingMatch ? thinkingMatch[0] + "\n\n" : "";
                          const fullContent = thinkingPrefix + summaryBody;
                          updated[lastAssistantIdx] = {
                            ...updated[lastAssistantIdx],
                            content: fullContent,
                          };
                          // Save to DB (without the thinking marker for clean storage)
                          createMessage(threadId!, "assistant", summaryBody).then(() => touchThread(threadId!));
                          return updated;
                        }
                        // Otherwise add a new message
                        createMessage(threadId!, "assistant", summaryBody).then(() => touchThread(threadId!));
                        return [...prev, {
                          id: generateId(),
                          threadId: threadId || "",
                          role: "assistant" as const,
                          content: summaryBody,
                          createdAt: new Date(),
                        }];
                      });
                    }

                    setResearchState((prev) => ({
                      ...prev,
                      isActive: false,
                      result: researchResult,
                    }));
                    setActivityState('idle');
                  },
                  onError: (err) => {
                    setResearchState((prev) => ({
                      ...prev,
                      isActive: false,
                      error: err.message,
                    }));
                    setActivityState('idle');
                  },
                  isCancelled: () => researchCancelledRef.current,
                }
              );

              result = {
                toolCallId: tc.id,
                result: "Research initiated. Parallel agents are now investigating sub-questions. Progress is shown in the research panel. A summary will appear in chat and the full report will be written to the canvas when complete.",
                success: true,
              };
            }
          }
        } else if (CANVAS_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeCanvasTool(toolCall, threadId);
        } else if (WEB_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeWebTool(toolCall);
        } else if (MEMORY_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeMemoryTool(toolCall);
        } else if (OBSIDIAN_TOOL_NAMES.includes(tc.function.name)) {
          result = await executeObsidianTool(toolCall);
        } else if (getMCPToolNames().includes(tc.function.name)) {
          result = await executeMCPTool(toolCall);
        } else if (isPluginTool(tc.function.name)) {
          result = await executePluginTool(toolCall);
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

        // Determine whether canvas tools should be included for this message
        const hasCanvasContent = canvasContent !== null && Array.isArray(canvasContent) && canvasContent.length > 0;
        const includeCanvas = shouldIncludeCanvasTools(trimmedContent, canvasIsOpen, hasCanvasContent);

        // Build messages for AI (include history)
        const aiMessages: AIChatMessage[] = [];

        // Always build and include system prompt (varies per message based on canvas inclusion)
        {
          let systemPrompt = await buildSystemPrompt(includeCanvas);

          aiMessages.push({
            role: "system",
            content: systemPrompt,
          });
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

        // Prepare chat options with tools (canvas conditionally included)
        const chatOptions: ChatOptions = {
          tools: getAllToolsForAI(includeCanvas),
          toolChoice: "auto",
        };

        // Tool calling loop - keep calling until no more tool calls
        let currentMessages = [...aiMessages];
        let finalContent = "";
        let response;
        const MAX_TOOL_ITERATIONS = 10; // Safety limit
        let iterations = 0;
        let hasReceivedFirstChunk = false;
        let thinkingContent = ""; // Accumulated thinking from tool-call rounds
        const accumulatedToolCalls: ToolCallDisplay[] = [];

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

            // Capture streamed content as "thinking" before clearing
            if (finalContent.trim()) {
              thinkingContent += (thinkingContent ? "\n\n" : "") + finalContent.trim();
            }

            // Track tool calls for display (skip deep_research — has its own panel)
            const newToolCalls: ToolCallDisplay[] = response.toolCalls
              .filter((tc) => tc.function.name !== "deep_research")
              .map((tc) => {
                let parsedArgs: Record<string, unknown> = {};
                try {
                  parsedArgs = JSON.parse(tc.function.arguments);
                } catch { /* ignore parse errors */ }
                return {
                  id: tc.id,
                  name: tc.function.name,
                  arguments: parsedArgs,
                  startedAt: Date.now(),
                };
              });
            accumulatedToolCalls.push(...newToolCalls);

            // Update UI with "executing" state
            if (newToolCalls.length > 0) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        metadata: {
                          ...msg.metadata,
                          toolCalls: [...accumulatedToolCalls],
                        },
                      }
                    : msg
                )
              );
            }

            // Execute tool calls
            const toolResults = await executeToolCalls(
              response.toolCalls,
              threadId || ""
            );

            // Update tool call displays with results
            for (const tc of response.toolCalls) {
              const display = accumulatedToolCalls.find((d) => d.id === tc.id);
              if (display) {
                const matchingResult = toolResults.find(
                  (r) => r.toolCallId === tc.id
                );
                display.result = matchingResult
                  ? typeof matchingResult.content === "string"
                    ? matchingResult.content
                    : JSON.stringify(matchingResult.content)
                  : undefined;
                display.success = display.result
                  ? !display.result.startsWith("Error") &&
                    !display.result.startsWith("Unknown tool")
                  : undefined;
                display.completedAt = Date.now();

                // MCP Apps: check if this tool has an interactive UI
                if (
                  display.success &&
                  getMCPToolNames().includes(tc.function.name)
                ) {
                  const resourceUri = getMCPToolUIResourceUri(tc.function.name);
                  if (resourceUri) {
                    const serverId = getServerIdFromQualifiedName(
                      tc.function.name
                    );
                    if (serverId) {
                      fetchMCPAppHtml(serverId, resourceUri).then((html) => {
                        if (html) {
                          display.mcpAppHtml = html;
                          display.mcpAppResourceUri = resourceUri;
                          display.mcpAppServerId = serverId;
                          // Trigger re-render with updated MCP App data
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === assistantMessageId
                                ? {
                                    ...msg,
                                    metadata: {
                                      ...msg.metadata,
                                      toolCalls: [...accumulatedToolCalls],
                                    },
                                  }
                                : msg
                            )
                          );
                        }
                      });
                    }
                  }
                }
              }
            }

            // Update UI with completed tool calls
            if (newToolCalls.length > 0) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        metadata: {
                          ...msg.metadata,
                          toolCalls: [...accumulatedToolCalls],
                        },
                      }
                    : msg
                )
              );
            }

            // Add tool results to messages
            currentMessages.push(...toolResults);

            // Clear the streamed content for next iteration
            // Show thinking in a collapsed block instead of clearing entirely
            finalContent = "";
            hasReceivedFirstChunk = false;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: thinkingContent ? `:::thinking\n${thinkingContent}\n:::` : "" }
                  : msg
              )
            );
          } else {
            // No more tool calls, we're done
            // Prefix final content with thinking if any was captured
            if (thinkingContent) {
              finalContent = `:::thinking\n${thinkingContent}\n:::\n\n${finalContent}`;
            }
            break;
          }
        }

        setStreamingMessageId(null);

        // Update message with final content and metadata
        const finalToolCalls =
          accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined;
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
                    toolCalls: finalToolCalls,
                  },
                }
              : msg
          )
        );

        // Save to DB — strip mcpAppHtml from tool calls to avoid bloating storage
        if (isTauriContext() && threadId && finalContent) {
          const dbToolCalls = finalToolCalls?.map(
            ({ mcpAppHtml: _, ...rest }) => rest
          );
          await createMessage(threadId, "assistant", finalContent, {
            model: response?.model,
            provider: aiConfig.provider,
            tokens: response?.tokens,
            toolCalls: dbToolCalls,
          });
          await touchThread(threadId);

          // Schedule narrative synthesis check after conversation activity
          // Debounced — resets on each new message, fires 60s after last exchange
          scheduleSynthesisCheck(60_000);
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
      canvasContent,
      executeToolCalls,
    ]
  );

  /**
   * Start deep research from explicit button click.
   * Creates a user message and triggers the sendMessage flow which
   * will cause the AI to call deep_research.
   */
  const startResearch = useCallback(
    (question: string) => {
      if (!question.trim() || isLoading) return;
      // Prefix to hint the AI to use deep_research tool
      sendMessage(`[Research] ${question}`);
    },
    [sendMessage, isLoading]
  );

  const cancelResearch = useCallback(() => {
    researchCancelledRef.current = true;
    setResearchState(INITIAL_RESEARCH_STATE);
    setActivityState('idle');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(undefined);
    setActiveThread(null);
    setResearchState(INITIAL_RESEARCH_STATE);
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
        startResearch,

        canvasIsOpen,
        setCanvasIsOpen,

        researchState,
        cancelResearch,
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

/**
 * Convert markdown text to SimpleBlock[] for canvas output.
 * Handles headings, paragraphs, and list items.
 */
function markdownToSimpleBlocks(markdown: string): SimpleBlock[] {
  const blocks: SimpleBlock[] = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) continue;

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        content: headingMatch[2].trim(),
        props: { level },
      });
      continue;
    }

    // Bullet list items
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (bulletMatch) {
      blocks.push({
        type: "listItem" as SimpleBlock["type"],
        content: bulletMatch[1].trim(),
        props: { listType: "bullet" },
      });
      continue;
    }

    // Numbered list items
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (numberedMatch) {
      blocks.push({
        type: "listItem" as SimpleBlock["type"],
        content: numberedMatch[1].trim(),
        props: { listType: "numbered" },
      });
      continue;
    }

    // Horizontal rules / metadata
    if (line.match(/^---+\s*$/)) continue;

    // Code block (skip — too complex for simple blocks)
    if (line.startsWith("```")) {
      // Skip until closing ```
      while (i + 1 < lines.length && !lines[i + 1].startsWith("```")) {
        i++;
      }
      if (i + 1 < lines.length) i++; // Skip closing ```
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: "paragraph",
      content: line.trim(),
    });
  }

  return blocks;
}
