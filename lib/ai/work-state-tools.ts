/**
 * Work State Tools for AI
 *
 * Defines tools that AI can call to manage the thread's work state.
 * These tools enable reading and updating objectives, open loops, blockers, and decisions.
 */

import { isTauriContext } from "@/lib/db";
import {
  getWorkState,
  saveWorkState,
  initializeWorkState,
} from "@/lib/db/work-state";
import {
  WorkState,
  OpenLoop,
  Blocker,
  RecentDecision,
  ConfidenceLevel,
  generateWorkStateItemId,
} from "@/types/work-state";
import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const WORK_STATE_TOOLS: ToolDefinition[] = [
  {
    name: "read_work_state",
    description:
      "Read the current work state for this thread. Returns the objective, next action, open loops, blockers, recent decisions, and confidence level. ALWAYS call this at the start of a conversation to understand context.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_work_state",
    description:
      "Update the work state fields. Use this to set or change the objective, next action, or confidence level.",
    parameters: {
      type: "object",
      properties: {
        objective: {
          type: "string",
          description: "The current objective or goal being worked on",
        },
        nextAction: {
          type: "string",
          description: "The immediate next action to take",
        },
        confidence: {
          type: "string",
          enum: ["low", "medium", "high"],
          description:
            "Confidence level in current direction. Low = unclear/exploring, Medium = reasonable path, High = clear direction",
        },
      },
      required: [],
    },
  },
  {
    name: "add_open_loop",
    description:
      "Add an open loop (unresolved question) to track. Use this when a question comes up that needs to be answered but isn't resolved yet.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The question or unresolved issue",
        },
        context: {
          type: "string",
          description: "Optional context about why this question matters",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "resolve_open_loop",
    description:
      "Resolve an open loop. Use this when a question has been answered or is no longer relevant.",
    parameters: {
      type: "object",
      properties: {
        loopId: {
          type: "string",
          description: "The ID of the open loop to resolve",
        },
        resolution: {
          type: "string",
          description: "Optional note about how it was resolved",
        },
      },
      required: ["loopId"],
    },
  },
  {
    name: "add_blocker",
    description:
      "Add a blocker that's preventing progress. Use this when something is blocking work and needs to be tracked.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Description of what's blocking progress",
        },
        waitingOn: {
          type: "string",
          description: "Who or what you're waiting on to resolve this",
        },
      },
      required: ["description", "waitingOn"],
    },
  },
  {
    name: "remove_blocker",
    description:
      "Remove a blocker that has been resolved. Use this when a blocker is no longer blocking.",
    parameters: {
      type: "object",
      properties: {
        blockerId: {
          type: "string",
          description: "The ID of the blocker to remove",
        },
      },
      required: ["blockerId"],
    },
  },
  {
    name: "record_decision",
    description:
      "Record an important decision that was made. Use this to track decisions for future reference.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title for the decision",
        },
        summary: {
          type: "string",
          description: "Brief summary of what was decided and why",
        },
      },
      required: ["title", "summary"],
    },
  },
];

export const WORK_STATE_TOOL_NAMES = WORK_STATE_TOOLS.map((t) => t.name);

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute a work state tool and return the result
 */
export async function executeWorkStateTool(
  toolCall: ToolCall,
  threadId: string
): Promise<ToolResult> {
  if (!isTauriContext()) {
    return {
      toolCallId: toolCall.id,
      result: "Error: Database operations require Tauri context",
      success: false,
    };
  }

  try {
    switch (toolCall.name) {
      case "read_work_state":
        return await executeReadWorkState(toolCall.id, threadId);

      case "update_work_state":
        return await executeUpdateWorkState(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            objective?: string;
            nextAction?: string;
            confidence?: ConfidenceLevel;
          }
        );

      case "add_open_loop":
        return await executeAddOpenLoop(
          toolCall.id,
          threadId,
          toolCall.arguments as { question: string; context?: string }
        );

      case "resolve_open_loop":
        return await executeResolveOpenLoop(
          toolCall.id,
          threadId,
          toolCall.arguments as { loopId: string; resolution?: string }
        );

      case "add_blocker":
        return await executeAddBlocker(
          toolCall.id,
          threadId,
          toolCall.arguments as { description: string; waitingOn: string }
        );

      case "remove_blocker":
        return await executeRemoveBlocker(
          toolCall.id,
          threadId,
          toolCall.arguments as { blockerId: string }
        );

      case "record_decision":
        return await executeRecordDecision(
          toolCall.id,
          threadId,
          toolCall.arguments as { title: string; summary: string }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown tool: ${toolCall.name}`,
          success: false,
        };
    }
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

/**
 * Read work state
 */
async function executeReadWorkState(
  toolCallId: string,
  threadId: string
): Promise<ToolResult> {
  let state = await getWorkState(threadId);

  if (!state) {
    // Initialize if thread exists but no state
    state = await initializeWorkState(threadId);
  }

  // Format for AI readability
  const formatted = formatWorkStateForAI(state);

  return {
    toolCallId,
    result: formatted,
    success: true,
  };
}

/**
 * Update work state
 */
async function executeUpdateWorkState(
  toolCallId: string,
  threadId: string,
  args: {
    objective?: string;
    nextAction?: string;
    confidence?: ConfidenceLevel;
  }
): Promise<ToolResult> {
  if (!args.objective && !args.nextAction && !args.confidence) {
    return {
      toolCallId,
      result: "No fields provided to update.",
      success: false,
    };
  }

  let state = await getWorkState(threadId);
  if (!state) {
    state = await initializeWorkState(threadId);
  }

  const updates: Partial<WorkState> = {};
  if (args.objective !== undefined) updates.objective = args.objective;
  if (args.nextAction !== undefined) updates.nextAction = args.nextAction;
  if (args.confidence !== undefined) updates.confidence = args.confidence;

  const updatedState: WorkState = {
    ...state,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);

  const updatedFields = Object.keys(updates).join(", ");
  return {
    toolCallId,
    result: `Updated work state: ${updatedFields}`,
    success: true,
  };
}

/**
 * Add open loop
 */
async function executeAddOpenLoop(
  toolCallId: string,
  threadId: string,
  args: { question: string; context?: string }
): Promise<ToolResult> {
  if (!args.question) {
    return {
      toolCallId,
      result: "Question is required.",
      success: false,
    };
  }

  let state = await getWorkState(threadId);
  if (!state) {
    state = await initializeWorkState(threadId);
  }

  const newLoop: OpenLoop = {
    id: generateWorkStateItemId(),
    question: args.question,
    context: args.context,
    createdAt: new Date().toISOString(),
  };

  const updatedState: WorkState = {
    ...state,
    openLoops: [...state.openLoops, newLoop],
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);

  return {
    toolCallId,
    result: `Added open loop "${newLoop.id}": ${args.question}`,
    success: true,
  };
}

/**
 * Resolve open loop
 */
async function executeResolveOpenLoop(
  toolCallId: string,
  threadId: string,
  args: { loopId: string; resolution?: string }
): Promise<ToolResult> {
  if (!args.loopId) {
    return {
      toolCallId,
      result: "Loop ID is required.",
      success: false,
    };
  }

  const state = await getWorkState(threadId);
  if (!state) {
    return {
      toolCallId,
      result: "No work state found.",
      success: false,
    };
  }

  const loopIndex = state.openLoops.findIndex((l) => l.id === args.loopId);
  if (loopIndex === -1) {
    return {
      toolCallId,
      result: `Open loop "${args.loopId}" not found.`,
      success: false,
    };
  }

  const resolvedLoop = state.openLoops[loopIndex];
  const updatedLoops = state.openLoops.filter((l) => l.id !== args.loopId);

  const updatedState: WorkState = {
    ...state,
    openLoops: updatedLoops,
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);

  return {
    toolCallId,
    result: `Resolved open loop: ${resolvedLoop.question}${args.resolution ? ` (${args.resolution})` : ""}`,
    success: true,
  };
}

/**
 * Add blocker
 */
async function executeAddBlocker(
  toolCallId: string,
  threadId: string,
  args: { description: string; waitingOn: string }
): Promise<ToolResult> {
  if (!args.description || !args.waitingOn) {
    return {
      toolCallId,
      result: "Both description and waitingOn are required.",
      success: false,
    };
  }

  let state = await getWorkState(threadId);
  if (!state) {
    state = await initializeWorkState(threadId);
  }

  const newBlocker: Blocker = {
    id: generateWorkStateItemId(),
    description: args.description,
    waitingOn: args.waitingOn,
    createdAt: new Date().toISOString(),
  };

  const updatedState: WorkState = {
    ...state,
    blockers: [...state.blockers, newBlocker],
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);

  return {
    toolCallId,
    result: `Added blocker "${newBlocker.id}": ${args.description} (waiting on: ${args.waitingOn})`,
    success: true,
  };
}

/**
 * Remove blocker
 */
async function executeRemoveBlocker(
  toolCallId: string,
  threadId: string,
  args: { blockerId: string }
): Promise<ToolResult> {
  if (!args.blockerId) {
    return {
      toolCallId,
      result: "Blocker ID is required.",
      success: false,
    };
  }

  const state = await getWorkState(threadId);
  if (!state) {
    return {
      toolCallId,
      result: "No work state found.",
      success: false,
    };
  }

  const blockerIndex = state.blockers.findIndex((b) => b.id === args.blockerId);
  if (blockerIndex === -1) {
    return {
      toolCallId,
      result: `Blocker "${args.blockerId}" not found.`,
      success: false,
    };
  }

  const removedBlocker = state.blockers[blockerIndex];
  const updatedBlockers = state.blockers.filter((b) => b.id !== args.blockerId);

  const updatedState: WorkState = {
    ...state,
    blockers: updatedBlockers,
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);

  return {
    toolCallId,
    result: `Removed blocker: ${removedBlocker.description}`,
    success: true,
  };
}

/**
 * Record decision
 */
async function executeRecordDecision(
  toolCallId: string,
  threadId: string,
  args: { title: string; summary: string }
): Promise<ToolResult> {
  if (!args.title || !args.summary) {
    return {
      toolCallId,
      result: "Both title and summary are required.",
      success: false,
    };
  }

  let state = await getWorkState(threadId);
  if (!state) {
    state = await initializeWorkState(threadId);
  }

  const newDecision: RecentDecision = {
    id: generateWorkStateItemId(),
    title: args.title,
    summary: args.summary,
    decidedAt: new Date().toISOString(),
  };

  // Keep only the last 10 decisions
  const updatedDecisions = [...state.recentDecisions, newDecision].slice(-10);

  const updatedState: WorkState = {
    ...state,
    recentDecisions: updatedDecisions,
    lastUpdated: new Date().toISOString(),
  };

  await saveWorkState(threadId, updatedState);

  return {
    toolCallId,
    result: `Recorded decision "${newDecision.id}": ${args.title}`,
    success: true,
  };
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format work state for AI readability
 */
function formatWorkStateForAI(state: WorkState): string {
  const lines: string[] = ["Current Work State:", ""];

  // Objective and next action
  if (state.objective) {
    lines.push(`Objective: ${state.objective}`);
  } else {
    lines.push("Objective: Not set");
  }

  if (state.nextAction) {
    lines.push(`Next Action: ${state.nextAction}`);
  } else {
    lines.push("Next Action: Not set");
  }

  lines.push(`Confidence: ${state.confidence}`);
  lines.push("");

  // Open loops
  if (state.openLoops.length > 0) {
    lines.push(`Open Loops (${state.openLoops.length}):`);
    for (const loop of state.openLoops) {
      lines.push(`  [${loop.id}] ${loop.question}`);
      if (loop.context) {
        lines.push(`    Context: ${loop.context}`);
      }
    }
    lines.push("");
  } else {
    lines.push("Open Loops: None");
    lines.push("");
  }

  // Blockers
  if (state.blockers.length > 0) {
    lines.push(`Blockers (${state.blockers.length}):`);
    for (const blocker of state.blockers) {
      lines.push(`  [${blocker.id}] ${blocker.description}`);
      lines.push(`    Waiting on: ${blocker.waitingOn}`);
    }
    lines.push("");
  } else {
    lines.push("Blockers: None");
    lines.push("");
  }

  // Recent decisions
  if (state.recentDecisions.length > 0) {
    lines.push(`Recent Decisions (${state.recentDecisions.length}):`);
    for (const decision of state.recentDecisions.slice(-5)) {
      lines.push(`  [${decision.id}] ${decision.title}`);
      lines.push(`    ${decision.summary}`);
    }
    lines.push("");
  } else {
    lines.push("Recent Decisions: None");
    lines.push("");
  }

  lines.push(`Last Updated: ${state.lastUpdated}`);

  return lines.join("\n");
}

// ============================================
// SYSTEM PROMPT
// ============================================

export const WORK_STATE_TOOLS_SYSTEM_PROMPT = `
## Work State Management

You maintain a structured work state for each conversation thread. This is your internal tracking system - invisible to the user. Use it to maintain context across sessions.

### Work State Tools:

1. **read_work_state** - Read the current work state. CALL THIS FIRST at the start of every conversation.
2. **update_work_state** - Update objective, next action, or confidence level.
3. **add_open_loop** - Track an unresolved question that needs to be answered.
4. **resolve_open_loop** - Mark a question as resolved.
5. **add_blocker** - Track something blocking progress.
6. **remove_blocker** - Mark a blocker as resolved.
7. **record_decision** - Record an important decision for future reference.

### Work State Fields:

- **Objective**: The current goal or focus area
- **Next Action**: The immediate next step to take
- **Confidence**: How clear the path forward is (low/medium/high)
- **Open Loops**: Unresolved questions needing answers
- **Blockers**: Things preventing progress
- **Recent Decisions**: Important decisions made (last 10 kept)

### Guidelines:

- ALWAYS read work state at the start of a conversation to understand context
- Update the objective when the focus changes
- Add open loops for questions that arise but aren't immediately resolved
- Track blockers when progress is stalled
- Record important decisions, especially ones that close off other options
- This state is INTERNAL ONLY - do not render it to the canvas
- Surface relevant state in conversation naturally (e.g., "I'm tracking that you're blocked on...")
`.trim();
