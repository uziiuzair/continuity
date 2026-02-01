/**
 * Artifact Tools for AI
 *
 * Tools for creating, managing, and querying tasks, notes, and decisions.
 * These artifacts are extracted from conversation and stored for later reference.
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import {
  createArtifact,
  getTasks,
  getArtifactsByThread,
  updateArtifact,
  completeTask,
  getArtifactById,
  deleteArtifact,
} from "@/lib/db/artifacts";
import { isTauriContext } from "@/lib/db";
import { ArtifactPriority } from "@/types";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const ARTIFACT_TOOLS: ToolDefinition[] = [
  {
    name: "create_task",
    description:
      "Create a task from the conversation. Use when the user mentions something actionable, asks you to add a task, or you identify an action item.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The task title - keep it concise and actionable",
        },
        description: {
          type: "string",
          description: "Optional description with more details",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Task priority (default: medium)",
        },
        dueDate: {
          type: "string",
          description: "Due date in ISO format (e.g., '2024-12-31')",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description:
      "Mark a task as completed. Use when the user says they finished a task or asks you to mark it done.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to complete",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "list_tasks",
    description:
      "List all tasks in the current thread. Use when the user asks to see their tasks or you need to reference existing tasks.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "all"],
          description: "Filter by status (default: active)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_note",
    description:
      "Save an important note or insight from the conversation. Use for key takeaways, summaries, or information worth preserving.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The note title",
        },
        content: {
          type: "string",
          description: "The note content",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "create_decision",
    description:
      "Record a decision made in the conversation. Use when a significant choice or conclusion is reached.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The decision title",
        },
        rationale: {
          type: "string",
          description: "The reasoning behind the decision",
        },
        alternatives: {
          type: "array",
          items: { type: "string" },
          description: "Other options that were considered",
        },
      },
      required: ["title", "rationale"],
    },
  },
  {
    name: "list_artifacts",
    description:
      "List all artifacts (tasks, notes, decisions) in the current thread.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["task", "note", "decision", "all"],
          description: "Filter by type (default: all)",
        },
      },
      required: [],
    },
  },
  {
    name: "delete_artifact",
    description:
      "Delete a task, note, or decision. Use when the user explicitly asks to remove an item.",
    parameters: {
      type: "object",
      properties: {
        artifactId: {
          type: "string",
          description: "The ID of the artifact to delete",
        },
      },
      required: ["artifactId"],
    },
  },
];

export const ARTIFACT_TOOL_NAMES = ARTIFACT_TOOLS.map((t) => t.name);

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute an artifact tool and return the result
 */
export async function executeArtifactTool(
  toolCall: ToolCall,
  threadId: string
): Promise<ToolResult> {
  if (!isTauriContext()) {
    return {
      toolCallId: toolCall.id,
      result: "Error: Artifact operations require Tauri context",
      success: false,
    };
  }

  if (!threadId) {
    return {
      toolCallId: toolCall.id,
      result: "Error: No active thread for artifact creation",
      success: false,
    };
  }

  try {
    switch (toolCall.name) {
      case "create_task":
        return await executeCreateTask(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            title: string;
            description?: string;
            priority?: ArtifactPriority;
            dueDate?: string;
          }
        );

      case "complete_task":
        return await executeCompleteTask(
          toolCall.id,
          toolCall.arguments as { taskId: string }
        );

      case "list_tasks":
        return await executeListTasks(
          toolCall.id,
          threadId,
          toolCall.arguments as { status?: "active" | "completed" | "all" }
        );

      case "create_note":
        return await executeCreateNote(
          toolCall.id,
          threadId,
          toolCall.arguments as { title: string; content: string }
        );

      case "create_decision":
        return await executeCreateDecision(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            title: string;
            rationale: string;
            alternatives?: string[];
          }
        );

      case "list_artifacts":
        return await executeListArtifacts(
          toolCall.id,
          threadId,
          toolCall.arguments as { type?: "task" | "note" | "decision" | "all" }
        );

      case "delete_artifact":
        return await executeDeleteArtifact(
          toolCall.id,
          toolCall.arguments as { artifactId: string }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown artifact tool: ${toolCall.name}`,
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

// ============================================
// INDIVIDUAL TOOL EXECUTORS
// ============================================

/**
 * Create a task
 */
async function executeCreateTask(
  toolCallId: string,
  threadId: string,
  args: {
    title: string;
    description?: string;
    priority?: ArtifactPriority;
    dueDate?: string;
  }
): Promise<ToolResult> {
  if (!args.title?.trim()) {
    return {
      toolCallId,
      result: "No title provided for task.",
      success: false,
    };
  }

  const task = await createArtifact({
    threadId,
    type: "task",
    title: args.title.trim(),
    content: args.description ? { description: args.description } : undefined,
    priority: args.priority || "medium",
    dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
  });

  const parts = [`Created task: "${task.title}"`];
  parts.push(`ID: ${task.id}`);
  if (args.priority) parts.push(`Priority: ${args.priority}`);
  if (args.dueDate) parts.push(`Due: ${args.dueDate}`);

  return {
    toolCallId,
    result: parts.join("\n"),
    success: true,
  };
}

/**
 * Complete a task
 */
async function executeCompleteTask(
  toolCallId: string,
  args: { taskId: string }
): Promise<ToolResult> {
  if (!args.taskId?.trim()) {
    return {
      toolCallId,
      result: "No task ID provided.",
      success: false,
    };
  }

  const existing = await getArtifactById(args.taskId);
  if (!existing) {
    return {
      toolCallId,
      result: `Task not found: ${args.taskId}`,
      success: false,
    };
  }

  if (existing.type !== "task") {
    return {
      toolCallId,
      result: `Item ${args.taskId} is not a task, it's a ${existing.type}`,
      success: false,
    };
  }

  await completeTask(args.taskId);

  return {
    toolCallId,
    result: `Completed task: "${existing.title}"`,
    success: true,
  };
}

/**
 * List tasks
 */
async function executeListTasks(
  toolCallId: string,
  threadId: string,
  args: { status?: "active" | "completed" | "all" }
): Promise<ToolResult> {
  const status = args.status || "active";

  let tasks;
  if (status === "all") {
    tasks = await getTasks(threadId);
    const completedTasks = await getTasks(threadId, "completed");
    tasks = [...tasks, ...completedTasks];
  } else {
    tasks = await getTasks(threadId, status);
  }

  if (tasks.length === 0) {
    return {
      toolCallId,
      result: `No ${status === "all" ? "" : status + " "}tasks found.`,
      success: true,
    };
  }

  const lines = [`Tasks (${tasks.length} total):`];
  for (const task of tasks) {
    const status_icon = task.status === "completed" ? "[x]" : "[ ]";
    const priority_str = task.priority ? ` (${task.priority})` : "";
    const due_str = task.dueDate
      ? ` - Due: ${task.dueDate.toLocaleDateString()}`
      : "";

    lines.push(`${status_icon} **${task.title}**${priority_str}${due_str}`);
    lines.push(`    ID: ${task.id}`);
  }

  return {
    toolCallId,
    result: lines.join("\n"),
    success: true,
  };
}

/**
 * Create a note
 */
async function executeCreateNote(
  toolCallId: string,
  threadId: string,
  args: { title: string; content: string }
): Promise<ToolResult> {
  if (!args.title?.trim()) {
    return {
      toolCallId,
      result: "No title provided for note.",
      success: false,
    };
  }

  if (!args.content?.trim()) {
    return {
      toolCallId,
      result: "No content provided for note.",
      success: false,
    };
  }

  const note = await createArtifact({
    threadId,
    type: "note",
    title: args.title.trim(),
    content: { text: args.content.trim() },
  });

  return {
    toolCallId,
    result: `Created note: "${note.title}"\nID: ${note.id}`,
    success: true,
  };
}

/**
 * Create a decision record
 */
async function executeCreateDecision(
  toolCallId: string,
  threadId: string,
  args: { title: string; rationale: string; alternatives?: string[] }
): Promise<ToolResult> {
  if (!args.title?.trim()) {
    return {
      toolCallId,
      result: "No title provided for decision.",
      success: false,
    };
  }

  if (!args.rationale?.trim()) {
    return {
      toolCallId,
      result: "No rationale provided for decision.",
      success: false,
    };
  }

  const decision = await createArtifact({
    threadId,
    type: "decision",
    title: args.title.trim(),
    content: {
      rationale: args.rationale.trim(),
      alternatives: args.alternatives || [],
    },
  });

  return {
    toolCallId,
    result: `Recorded decision: "${decision.title}"\nID: ${decision.id}`,
    success: true,
  };
}

/**
 * List all artifacts
 */
async function executeListArtifacts(
  toolCallId: string,
  threadId: string,
  args: { type?: "task" | "note" | "decision" | "all" }
): Promise<ToolResult> {
  const filterType = args.type || "all";

  let artifacts;
  if (filterType === "all") {
    artifacts = await getArtifactsByThread(threadId);
  } else {
    artifacts = await getArtifactsByThread(threadId, filterType);
  }

  if (artifacts.length === 0) {
    return {
      toolCallId,
      result: `No ${filterType === "all" ? "" : filterType + " "}artifacts found.`,
      success: true,
    };
  }

  const lines = [`Artifacts (${artifacts.length} total):`];

  // Group by type
  const grouped: Record<string, typeof artifacts> = {};
  for (const art of artifacts) {
    if (!grouped[art.type]) grouped[art.type] = [];
    grouped[art.type].push(art);
  }

  for (const [type, items] of Object.entries(grouped)) {
    lines.push("");
    lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)}s`);

    for (const item of items) {
      const status_str = item.type === "task" ? ` [${item.status}]` : "";
      lines.push(`- **${item.title}**${status_str}`);
      lines.push(`  ID: ${item.id}`);
    }
  }

  return {
    toolCallId,
    result: lines.join("\n"),
    success: true,
  };
}

/**
 * Delete an artifact
 */
async function executeDeleteArtifact(
  toolCallId: string,
  args: { artifactId: string }
): Promise<ToolResult> {
  if (!args.artifactId?.trim()) {
    return {
      toolCallId,
      result: "No artifact ID provided.",
      success: false,
    };
  }

  const existing = await getArtifactById(args.artifactId);
  if (!existing) {
    return {
      toolCallId,
      result: `Artifact not found: ${args.artifactId}`,
      success: false,
    };
  }

  await deleteArtifact(args.artifactId);

  return {
    toolCallId,
    result: `Deleted ${existing.type}: "${existing.title}"`,
    success: true,
  };
}

// ============================================
// SYSTEM PROMPT ADDITION FOR ARTIFACT TOOLS
// ============================================

export const ARTIFACT_TOOLS_SYSTEM_PROMPT = `
You have tools for managing tasks, notes, and decisions:

**Tasks:**
- **create_task** - Create an actionable task. Use when:
  - User says "add a task", "remind me to", "I need to"
  - You identify an action item in the conversation
- **complete_task** - Mark a task as done
- **list_tasks** - See current tasks

**Notes:**
- **create_note** - Save important information. Use when:
  - Key insights or summaries worth preserving
  - User asks to "note this" or "save this"

**Decisions:**
- **create_decision** - Record a decision with rationale. Use when:
  - A significant choice is made
  - User wants to document why something was decided

**General:**
- **list_artifacts** - See all artifacts (tasks, notes, decisions)
- **delete_artifact** - Remove an artifact

## Important guidelines:

- Be selective - don't create artifacts for every statement
- Tasks should be actionable and specific
- Include task IDs when referencing existing tasks
- Notes should capture meaningful information, not every detail
- Decisions should include the reasoning (rationale)
`.trim();
