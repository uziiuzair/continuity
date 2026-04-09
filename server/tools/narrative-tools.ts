import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNarrative, saveNarrative, getAllNarratives } from "../db/narratives.js";
import { recordLearning, getUnabsorbedLearnings, getLearnings, countUnabsorbedLearnings } from "../db/learnings.js";

const MemoryScopeEnum = z.enum(["global", "project"]);
const SignalTypeEnum = z.enum(["correction", "preference", "rejection", "approval", "explicit", "behavioral"]);

export function registerNarrativeTools(server: McpServer): void {
  // --- Narrative Tools ---

  server.tool(
    "narrative_read",
    "Read the current synthesized narrative (the AI's mental model) for a scope. Returns the narrative content, sections, confidence score, and version.",
    {
      scope: MemoryScopeEnum.optional().describe("Scope: 'global' or 'project' (default: global)"),
      project_id: z.string().optional().describe("Project ID if scope is 'project'"),
    },
    async ({ scope, project_id }) => {
      try {
        const narrative = getNarrative(scope || "global", project_id);
        if (!narrative) {
          return {
            content: [{ type: "text" as const, text: "No narrative synthesized yet for this scope." }],
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(narrative, null, 2) }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  server.tool(
    "narrative_save",
    "Save or update a synthesized narrative. Used by the synthesis engine after generating a new narrative from memories and learnings.",
    {
      scope: MemoryScopeEnum.optional().describe("Scope: 'global' or 'project'"),
      project_id: z.string().optional().describe("Project ID if scope is 'project'"),
      content: z.string().describe("The narrative content (2-4 paragraph mental model briefing)"),
      sections: z.string().describe("JSON string of structured sections (user, workStyle, projects, patterns, priorities, qualityCriteria, learnings)"),
      confidence: z.number().min(0).max(1).describe("AI confidence in its understanding (0.0-1.0)"),
      memory_snapshot_hash: z.string().optional().describe("Hash of input memories for staleness detection"),
    },
    async ({ scope, project_id, content, sections, confidence, memory_snapshot_hash }) => {
      try {
        const narrative = saveNarrative({
          scope,
          project_id,
          content,
          sections,
          confidence,
          memory_snapshot_hash,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Narrative saved (v${narrative.version}, confidence: ${narrative.confidence})`,
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
    "narrative_list",
    "List all narratives across all scopes. Useful for seeing the AI's understanding across global and project-specific contexts.",
    {},
    async () => {
      try {
        const narratives = getAllNarratives();
        if (narratives.length === 0) {
          return { content: [{ type: "text" as const, text: "No narratives exist yet." }] };
        }
        const summary = narratives.map((n) =>
          `- ${n.scope}${n.project_id ? ` (project: ${n.project_id})` : ""}: v${n.version}, confidence ${n.confidence}, last synthesized ${n.last_synthesized_at}`
        ).join("\n");
        return {
          content: [{ type: "text" as const, text: `${narratives.length} narrative(s):\n${summary}` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );

  // --- Learning Tools ---

  server.tool(
    "learning_record",
    "Record a learning signal extracted from a conversation. Learnings accumulate and get absorbed into the narrative during synthesis.",
    {
      signal_type: SignalTypeEnum.describe("Type of signal: correction, preference, rejection, approval, explicit, behavioral"),
      observation: z.string().describe("What was learned — a concise insight about the user's preferences, patterns, or criteria"),
      confidence: z.number().min(0).max(1).optional().describe("Confidence level (0.0-1.0). Direct statements = 0.8-0.95, implied = 0.5-0.7, weak signal = 0.3-0.5"),
      scope: MemoryScopeEnum.optional().describe("Scope: 'global' or 'project'"),
      project_id: z.string().optional().describe("Project ID if scope is 'project'"),
      source_thread_id: z.string().optional().describe("Thread where the learning was observed"),
      source_message_id: z.string().optional().describe("Specific message that triggered the learning"),
    },
    async ({ signal_type, observation, confidence, scope, project_id, source_thread_id, source_message_id }) => {
      try {
        const learning = recordLearning({
          signal_type,
          observation,
          confidence,
          scope,
          project_id,
          source_thread_id,
          source_message_id,
        });
        const unabsorbed = countUnabsorbedLearnings(scope || "global", project_id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Learning recorded (${learning.signal_type}, confidence: ${learning.confidence}). ${unabsorbed} unabsorbed learning(s) pending synthesis.`,
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
    "learning_list",
    "List recent learnings, optionally filtered by scope. Shows both absorbed and unabsorbed learnings.",
    {
      scope: MemoryScopeEnum.optional().describe("Filter by scope"),
      project_id: z.string().optional().describe("Filter by project"),
      limit: z.number().optional().describe("Max results (default 50)"),
    },
    async ({ scope, project_id, limit }) => {
      try {
        const learnings = getLearnings(scope || "global", project_id, limit || 50);
        if (learnings.length === 0) {
          return { content: [{ type: "text" as const, text: "No learnings recorded yet." }] };
        }
        const lines = learnings.map((l) =>
          `- [${l.signal_type}] ${l.observation} (confidence: ${l.confidence}, ${l.absorbed_into_narrative ? "absorbed" : "pending"})`
        );
        return {
          content: [{ type: "text" as const, text: `${learnings.length} learning(s):\n${lines.join("\n")}` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
