import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createProject, listProjects, getProject } from "../db/projects.js";

export function registerProjectTools(server: McpServer): void {
  server.tool(
    "project_create",
    "Create a new project scope for organizing project-specific memories.",
    {
      name: z.string().describe("Project name"),
      description: z.string().optional().describe("Project description"),
      path: z.string().optional().describe("Filesystem path to the project root"),
    },
    async ({ name, description, path }) => {
      try {
        const project = createProject({ name, description, path });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(project, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "project_list",
    "List all active projects (non-archived).",
    {},
    async () => {
      try {
        const projects = listProjects();
        if (projects.length === 0) {
          return { content: [{ type: "text" as const, text: "No projects found" }] };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "project_get",
    "Get a project by ID, optionally including all its memories.",
    {
      id: z.string().describe("Project ID"),
      include_memories: z.boolean().optional().describe("Whether to include all project memories"),
    },
    async ({ id, include_memories }) => {
      try {
        const result = getProject(id, include_memories);
        if (!result) {
          return { content: [{ type: "text" as const, text: `Project not found: ${id}` }] };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
