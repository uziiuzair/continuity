import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { linkMemories, getMemoryLinks } from "../db/relationships.js";

export function registerRelationshipTools(server: McpServer): void {
  server.tool(
    "memory_link",
    "Create a relationship between two memories. Types: related, depends_on, contradicts, supersedes, implements.",
    {
      memory_id_a: z.string().describe("First memory ID"),
      memory_id_b: z.string().describe("Second memory ID"),
      relationship_type: z
        .enum(["related", "depends_on", "contradicts", "supersedes", "implements"])
        .optional()
        .describe("Relationship type (default: 'related')"),
    },
    async ({ memory_id_a, memory_id_b, relationship_type }) => {
      try {
        const link = linkMemories({ memory_id_a, memory_id_b, relationship_type });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(link, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "memory_links_get",
    "Get all memories linked to a given memory, including the relationship type.",
    {
      memory_id: z.string().describe("Memory ID to find links for"),
    },
    async ({ memory_id }) => {
      try {
        const links = getMemoryLinks(memory_id);
        if (links.length === 0) {
          return { content: [{ type: "text" as const, text: `No links found for memory ${memory_id}` }] };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(links, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
