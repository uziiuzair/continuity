/**
 * Obsidian Vault Tools for AI
 *
 * Tools that allow the AI to read from and write to the user's
 * Obsidian vault during conversations. The AI uses these to:
 * - Read existing vault files for context
 * - Write new files (with user approval via conversation)
 * - Search vault contents
 * - List folder contents
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import { isTauriContext } from "@/lib/db";
import { isVaultConnected, getVaultConfig } from "@/lib/vault/config";
import {
  readVaultFile,
  writeVaultFile,
  vaultExists,
  listVaultDir,
  walkVaultFiles,
} from "@/lib/vault/file-ops";
import { rescanFiles } from "@/lib/vault/scanner";
import { updateVaultMemoryFile } from "@/lib/vault/memory";
import { getVaultMemory } from "@/lib/vault/memory";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const OBSIDIAN_TOOLS: ToolDefinition[] = [
  {
    name: "read_obsidian_file",
    description:
      "Read a specific markdown file from the user's connected Obsidian vault. Use this when the conversation topic relates to something you know exists in their vault (from the vault index in your memory). Returns the full file content.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative path to the file within the vault (e.g., 'Projects/Work/Q1-Goals.md')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_to_obsidian",
    description:
      "Write or update a markdown file in the user's Obsidian vault. Use this ONLY after suggesting the sync to the user and receiving their approval. Creates parent directories automatically. Content should be well-formatted markdown with appropriate frontmatter.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative path for the file within the vault (e.g., 'Continuity/Artifacts/tasks/review-expenses.md')",
        },
        content: {
          type: "string",
          description:
            "Full markdown content to write, including YAML frontmatter if appropriate",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "search_obsidian",
    description:
      "Search the user's Obsidian vault for files matching a query. Searches both file names and content. Use this when you need to find relevant files but don't know the exact path.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query — matches against file names and content",
        },
        folder: {
          type: "string",
          description:
            "Optional: limit search to a specific folder (e.g., 'Projects/')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_obsidian_folder",
    description:
      "List the contents of a folder in the user's Obsidian vault. Shows files and subfolders. Use this to explore the vault structure.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Relative path to the folder (e.g., 'Projects/Work'). Use empty string or '/' for vault root.",
        },
      },
      required: ["path"],
    },
  },
];

export const OBSIDIAN_TOOL_NAMES = OBSIDIAN_TOOLS.map((t) => t.name);

// ============================================
// TOOL EXECUTION
// ============================================

export async function executeObsidianTool(
  toolCall: ToolCall
): Promise<ToolResult> {
  if (!isTauriContext()) {
    return {
      toolCallId: toolCall.id,
      result: "Error: Obsidian tools require the desktop app",
      success: false,
    };
  }

  const connected = await isVaultConnected();
  if (!connected) {
    return {
      toolCallId: toolCall.id,
      result:
        "Obsidian vault is not connected. The user can connect their vault in Settings > Connectors.",
      success: false,
    };
  }

  try {
    switch (toolCall.name) {
      case "read_obsidian_file":
        return await executeReadFile(
          toolCall.id,
          toolCall.arguments as { path: string }
        );

      case "write_to_obsidian":
        return await executeWriteFile(
          toolCall.id,
          toolCall.arguments as { path: string; content: string }
        );

      case "search_obsidian":
        return await executeSearch(
          toolCall.id,
          toolCall.arguments as { query: string; folder?: string }
        );

      case "list_obsidian_folder":
        return await executeListFolder(
          toolCall.id,
          toolCall.arguments as { path: string }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown Obsidian tool: ${toolCall.name}`,
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

async function executeReadFile(
  toolCallId: string,
  args: { path: string }
): Promise<ToolResult> {
  if (!args.path?.trim()) {
    return {
      toolCallId,
      result: "No file path provided.",
      success: false,
    };
  }

  const fileExists = await vaultExists(args.path);
  if (!fileExists) {
    return {
      toolCallId,
      result: `File not found in vault: ${args.path}`,
      success: false,
    };
  }

  const content = await readVaultFile(args.path);

  // Truncate very large files
  const MAX_CONTENT = 10000;
  const truncated = content.length > MAX_CONTENT;
  const displayContent = truncated
    ? content.slice(0, MAX_CONTENT) + "\n\n... (truncated, file is very large)"
    : content;

  return {
    toolCallId,
    result: `File: ${args.path}\n\n${displayContent}`,
    success: true,
  };
}

async function executeWriteFile(
  toolCallId: string,
  args: { path: string; content: string }
): Promise<ToolResult> {
  if (!args.path?.trim()) {
    return { toolCallId, result: "No file path provided.", success: false };
  }
  if (!args.content) {
    return { toolCallId, result: "No content provided.", success: false };
  }

  // Ensure path ends with .md
  const path = args.path.endsWith(".md") ? args.path : args.path + ".md";

  await writeVaultFile(path, args.content);

  // Update vault memory with new file info
  try {
    const scanned = await rescanFiles([path]);
    if (scanned.length > 0) {
      await updateVaultMemoryFile(scanned[0]);
    }
  } catch {
    // Non-critical — memory update can fail silently
  }

  return {
    toolCallId,
    result: `Successfully wrote to vault: ${path}`,
    success: true,
  };
}

async function executeSearch(
  toolCallId: string,
  args: { query: string; folder?: string }
): Promise<ToolResult> {
  if (!args.query?.trim()) {
    return { toolCallId, result: "No search query provided.", success: false };
  }

  const query = args.query.toLowerCase();
  const folder = args.folder || "";

  // Get all markdown files
  const allFiles = await walkVaultFiles(folder, 5);

  // Search by filename first
  const nameMatches = allFiles.filter((f) =>
    f.toLowerCase().includes(query)
  );

  // Search by content for remaining files (limit to avoid performance issues)
  const contentMatches: { path: string; excerpt: string }[] = [];
  const filesToSearch = allFiles
    .filter((f) => !nameMatches.includes(f))
    .slice(0, 100);

  for (const filePath of filesToSearch) {
    try {
      const content = await readVaultFile(filePath);
      const lowerContent = content.toLowerCase();
      const idx = lowerContent.indexOf(query);
      if (idx !== -1) {
        // Extract surrounding context
        const start = Math.max(0, idx - 50);
        const end = Math.min(content.length, idx + query.length + 50);
        const excerpt = content.slice(start, end).replace(/\n/g, " ").trim();
        contentMatches.push({ path: filePath, excerpt: `...${excerpt}...` });
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (nameMatches.length === 0 && contentMatches.length === 0) {
    return {
      toolCallId,
      result: `No files found matching "${args.query}"${folder ? ` in ${folder}` : ""}`,
      success: true,
    };
  }

  const lines: string[] = [];

  if (nameMatches.length > 0) {
    lines.push(`Files matching "${args.query}" by name:`);
    for (const match of nameMatches.slice(0, 20)) {
      lines.push(`  - ${match}`);
    }
  }

  if (contentMatches.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`Files matching "${args.query}" by content:`);
    for (const match of contentMatches.slice(0, 15)) {
      lines.push(`  - ${match.path}`);
      lines.push(`    ${match.excerpt}`);
    }
  }

  return {
    toolCallId,
    result: lines.join("\n"),
    success: true,
  };
}

async function executeListFolder(
  toolCallId: string,
  args: { path: string }
): Promise<ToolResult> {
  const folderPath = args.path === "/" ? "" : (args.path || "");

  try {
    const entries = await listVaultDir(folderPath);

    if (entries.length === 0) {
      return {
        toolCallId,
        result: `Folder is empty: ${folderPath || "/"}`,
        success: true,
      };
    }

    const folders = entries
      .filter((e) => e.isDirectory && !e.name.startsWith("."))
      .map((e) => `  📁 ${e.name}/`);
    const files = entries
      .filter((e) => !e.isDirectory && !e.name.startsWith("."))
      .map((e) => `  📄 ${e.name}`);

    const lines = [`Contents of ${folderPath || "/"} (${entries.length} items):`];
    if (folders.length > 0) {
      lines.push("", "Folders:", ...folders);
    }
    if (files.length > 0) {
      lines.push("", "Files:", ...files);
    }

    return {
      toolCallId,
      result: lines.join("\n"),
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      result: `Error listing folder: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

// ============================================
// SYSTEM PROMPT
// ============================================

/**
 * Build the Obsidian tools system prompt, including vault memory context
 */
export async function getObsidianToolsSystemPrompt(): Promise<string | null> {
  const connected = await isVaultConnected();
  if (!connected) return null;

  const config = await getVaultConfig();
  const vaultMemory = await getVaultMemory();

  const parts = [OBSIDIAN_TOOLS_BASE_PROMPT];

  if (vaultMemory) {
    parts.push(`\n## Current Vault Index\n\n${vaultMemory}`);
  } else if (config) {
    parts.push(
      `\nVault connected at: ${config.path}\nVault has not been scanned yet. The user may need to rescan in settings.`
    );
  }

  return parts.join("\n");
}

const OBSIDIAN_TOOLS_BASE_PROMPT = `
## Obsidian Vault Integration

The user has connected their Obsidian vault. You have tools to read from and write to it.

### Available Tools

1. **read_obsidian_file** — Read a specific file from the vault. Use when:
   - The conversation topic relates to a file you know exists in the vault
   - The user references something that might be in their vault
   - You need context from an existing document

2. **write_to_obsidian** — Write or update a file in the vault. Use ONLY when:
   - You've suggested syncing and the user approved
   - You've created a meaningful artifact (task, note, decision, plan)
   - The user explicitly asks to save something to Obsidian
   - Content has lasting value (not casual conversation)

3. **search_obsidian** — Search vault files by name or content. Use when:
   - You need to find a file but don't know the exact path
   - The user references a topic that might be in their vault

4. **list_obsidian_folder** — Browse vault folder contents. Use for exploration.

### When to Suggest Syncing to Obsidian

Propose vault writes at **meaningful moments**, not after every message:
- ✅ Artifact created with lasting value (task, plan, decision)
- ✅ Structured output that represents a document
- ✅ Journal entries or daily reflections
- ✅ Key decisions made during conversation
- ✅ Project milestones or significant progress
- ✅ User explicitly asks to save to Obsidian

Do NOT suggest syncing for:
- ❌ Casual conversation or quick Q&A
- ❌ Intermediate work-in-progress
- ❌ Every single message or minor update

### File Organization

When writing new files, follow this structure:
- \`Continuity/Artifacts/tasks/\` — Tasks
- \`Continuity/Artifacts/notes/\` — Notes
- \`Continuity/Artifacts/decisions/\` — Decisions
- \`Continuity/Threads/\` — Conversation summaries
- \`Continuity/Journal/\` — Daily entries

You can also update **existing files** in the vault when it makes sense.

### Markdown Format

Always include YAML frontmatter with at minimum:
\`\`\`yaml
---
source: continuity
type: task|note|decision|thread|journal
created: <ISO timestamp>
---
\`\`\`

### Reading Vault for Context

When the user discusses a topic and you know (from the vault index) that a relevant file exists, proactively read it for context. For example:
- User asks about budget → read their Budget.md
- User discusses Q1 goals → read Q1-Goals.md
- User mentions a project → check if there's a project folder

This enriches your responses with the user's own notes and data.
`.trim();
