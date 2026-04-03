import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchMemories } from "../db/search.js";

export function registerSearchTools(server: McpServer): void {
  server.tool(
    "memory_search",
    "Search memories by keyword across key, content, and tags. Supports filtering by scope, project, type, and tags.",
    {
      query: z.string().describe("Search query — matches against key, content, and tags"),
      scope: z.enum(["global", "project"]).optional().describe("Filter by scope"),
      project_id: z.string().optional().describe("Filter by project ID"),
      type: z.enum(["decision", "preference", "context", "constraint", "pattern"]).optional().describe("Filter by memory type"),
      tags: z.array(z.string()).optional().describe("Filter by tags (matches any)"),
      limit: z.number().optional().describe("Max results (default 20)"),
    },
    async ({ query, scope, project_id, type, tags, limit }) => {
      try {
        const results = searchMemories({ query, scope, project_id, type, tags, limit });
        if (results.length === 0) {
          return { content: [{ type: "text" as const, text: `No memories found matching "${query}"` }] };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${results.length} memories:\n\n${JSON.stringify(results, null, 2)}`,
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
