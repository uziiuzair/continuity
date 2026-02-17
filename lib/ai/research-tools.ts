/**
 * Research Tools for AI
 *
 * Defines the deep_research tool that triggers multi-step research.
 * Same pattern as web-tools.ts, memory-tools.ts, etc.
 */

import { ToolDefinition } from "./canvas-tools";

export const RESEARCH_TOOLS: ToolDefinition[] = [
  {
    name: "deep_research",
    description:
      "Perform deep, multi-step research on a complex question. Spawns parallel research agents that each investigate a sub-question independently — searching the web, reading sources, and extracting findings. Results are synthesized into a summary (shown in chat) and a full report (written to the canvas). Use this for questions that require investigating multiple aspects, comparing sources, or building a comprehensive understanding. Takes 30-120 seconds depending on complexity.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "The research question to investigate thoroughly. Should be specific enough to yield useful results.",
        },
        context: {
          type: "string",
          description:
            "Optional additional context or constraints for the research (e.g., 'focus on recent developments', 'compare at least 3 approaches').",
        },
      },
      required: ["question"],
    },
  },
];

export const RESEARCH_TOOL_NAMES = RESEARCH_TOOLS.map((t) => t.name);

export const RESEARCH_TOOLS_SYSTEM_PROMPT = `
You have access to a deep research tool:

**deep_research** - Perform multi-step research with parallel agents. Use this when:
- The user asks a complex question that needs multiple angles of investigation
- The user explicitly asks for research, a report, or in-depth analysis
- The question requires comparing multiple sources or approaches
- A simple web search wouldn't provide a comprehensive enough answer
- The user clicks the Research button

When to use deep_research vs web_search:
- **web_search**: Quick lookups, simple facts, single-source answers
- **deep_research**: Complex topics, multi-faceted questions, comparative analysis, when the user says "research this" or "give me a thorough analysis"

The deep research process:
1. Plans sub-questions to investigate
2. Spawns parallel agents that search and read sources
3. Checks for gaps and does follow-up if needed
4. Synthesizes findings into a summary (chat) and full report (canvas)

The research takes 30-120 seconds. Progress is shown in a panel below the chat.
`.trim();
