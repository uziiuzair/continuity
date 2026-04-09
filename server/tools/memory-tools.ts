import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeMemory, readMemory, updateMemory, deleteMemory, bulkImportMemories } from "../db/memories.js";

const MemoryTypeEnum = z.enum(["decision", "preference", "context", "constraint", "pattern"]);
const MemoryScopeEnum = z.enum(["global", "project"]);
const MemorySourceEnum = z.enum(["user", "ai", "system"]);

export function registerMemoryTools(server: McpServer): void {
  server.tool(
    "memory_write",
    "Create or update a memory. If a memory with the same key+scope+project already exists, it will be updated and versioned.",
    {
      key: z.string().describe("Human-readable key like 'preferred-orm' or 'auth-strategy'"),
      content: z.string().describe("The memory content — what to remember"),
      type: MemoryTypeEnum.optional().describe("Memory type: decision, preference, context, constraint, or pattern"),
      scope: MemoryScopeEnum.optional().describe("Scope: 'global' for cross-project, 'project' for project-specific"),
      project_id: z.string().optional().describe("Project ID if scope is 'project'"),
      tags: z.array(z.string()).optional().describe("Tags for categorization, e.g. ['typescript', 'tooling']"),
      metadata: z.record(z.unknown()).optional().describe("Additional structured metadata"),
      source: MemorySourceEnum.optional().describe("Who wrote this: 'user' (explicit preference), 'ai' (inferred), 'system' (automated)"),
    },
    async ({ key, content, type, scope, project_id, tags, metadata, source }) => {
      try {
        const memory = writeMemory({ key, content, type, scope, project_id, tags, metadata, source });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(memory, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "memory_read",
    "Read a memory by ID or by key+scope. Returns the memory content, type, tags, and version info.",
    {
      id: z.string().optional().describe("Memory ID for direct lookup"),
      key: z.string().optional().describe("Memory key for lookup by key+scope"),
      scope: MemoryScopeEnum.optional().describe("Scope to search within (used with key)"),
      project_id: z.string().optional().describe("Project ID (used with key + scope='project')"),
    },
    async ({ id, key, scope, project_id }) => {
      try {
        const memory = readMemory({ id, key, scope, project_id });
        if (!memory) {
          return { content: [{ type: "text" as const, text: "Memory not found" }] };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(memory, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "memory_update",
    "Update an existing memory's content, type, tags, or metadata. Automatically bumps the version and records history.",
    {
      id: z.string().describe("Memory ID to update"),
      content: z.string().optional().describe("New content"),
      type: MemoryTypeEnum.optional().describe("New type"),
      tags: z.array(z.string()).optional().describe("New tags (replaces existing)"),
      metadata: z.record(z.unknown()).optional().describe("New metadata (replaces existing)"),
      change_reason: z.string().optional().describe("Why this change was made"),
    },
    async ({ id, content, type, tags, metadata, change_reason }) => {
      try {
        const memory = updateMemory({ id, content, type, tags, metadata, change_reason });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(memory, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "memory_delete",
    "Soft-delete a memory (sets archived_at timestamp). The memory can still be found in version history.",
    {
      id: z.string().describe("Memory ID to archive"),
    },
    async ({ id }) => {
      try {
        const deleted = deleteMemory(id);
        return {
          content: [
            { type: "text" as const, text: deleted ? `Memory ${id} archived successfully` : `Memory ${id} not found or already archived` },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "memory_bulk_import",
    "Import multiple memories at once in a single transaction. Great for migrating existing context.",
    {
      memories: z.array(
        z.object({
          key: z.string(),
          content: z.string(),
          type: MemoryTypeEnum.optional(),
          scope: MemoryScopeEnum.optional(),
          project_id: z.string().optional(),
          tags: z.array(z.string()).optional(),
          metadata: z.record(z.unknown()).optional(),
        })
      ).describe("Array of memories to import"),
    },
    async ({ memories }) => {
      try {
        const results = bulkImportMemories(memories);
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully imported ${results.length} memories:\n${results.map((m) => `  - ${m.key} (${m.id})`).join("\n")}`,
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
