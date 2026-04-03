import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getVersionHistory } from "../db/versions.js";

export function registerLifecycleTools(server: McpServer): void {
  server.tool(
    "memory_version_history",
    "Get the full version history of a memory — see how it changed over time, who changed it, and why.",
    {
      memory_id: z.string().describe("Memory ID to get version history for"),
    },
    async ({ memory_id }) => {
      try {
        const versions = getVersionHistory(memory_id);
        if (versions.length === 0) {
          return { content: [{ type: "text" as const, text: `No version history found for memory ${memory_id}` }] };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `${versions.length} versions:\n\n${JSON.stringify(versions, null, 2)}`,
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
