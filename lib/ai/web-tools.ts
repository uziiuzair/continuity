/**
 * Web Tools for AI
 *
 * Tools for web search, URL reading, and temporal awareness.
 * Uses Tauri's HTTP plugin to bypass CORS restrictions.
 */

import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import { getSetting } from "@/lib/db/settings";
import { isTauriContext } from "@/lib/db";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const WEB_TOOLS: ToolDefinition[] = [
  {
    name: "web_search",
    description:
      "Search the internet for current information. Use for research, fact-checking, finding documentation, or getting up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default: 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_url",
    description:
      "Read and extract the main content from a web page. Returns clean text content suitable for analysis. Use when the user shares a URL or asks you to read a specific page.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to read",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_current_time",
    description:
      "Get the current date and time. Use for scheduling, deadlines, time-based queries, or when the user asks about the current time or date.",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description:
            "IANA timezone (e.g., 'America/New_York', 'Europe/London'). Defaults to the user's local timezone.",
        },
      },
      required: [],
    },
  },
];

export const WEB_TOOL_NAMES = WEB_TOOLS.map((t) => t.name);

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute a web tool and return the result
 */
export async function executeWebTool(toolCall: ToolCall): Promise<ToolResult> {
  try {
    switch (toolCall.name) {
      case "web_search":
        return await executeWebSearch(
          toolCall.id,
          toolCall.arguments as { query: string; maxResults?: number }
        );

      case "read_url":
        return await executeReadUrl(
          toolCall.id,
          toolCall.arguments as { url: string }
        );

      case "get_current_time":
        return await executeGetCurrentTime(
          toolCall.id,
          toolCall.arguments as { timezone?: string }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown web tool: ${toolCall.name}`,
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

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

/**
 * Execute web search using Tavily API
 */
async function executeWebSearch(
  toolCallId: string,
  args: { query: string; maxResults?: number }
): Promise<ToolResult> {
  if (!args.query?.trim()) {
    return {
      toolCallId,
      result: "No search query provided.",
      success: false,
    };
  }

  // Get Tavily API key from settings
  let tavilyApiKey: string | null = null;
  if (isTauriContext()) {
    tavilyApiKey = await getSetting("tavily_api_key");
  }

  if (!tavilyApiKey) {
    return {
      toolCallId,
      result:
        "Web search is not configured. Please add your Tavily API key in Settings > API Keys.",
      success: false,
    };
  }

  const maxResults = args.maxResults || 5;

  try {
    // Use Tauri's HTTP plugin to bypass CORS
    const response = await tauriFetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: args.query,
        max_results: maxResults,
        include_answer: true,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
    }

    const data: TavilyResponse = await response.json();

    // Format results for AI
    const lines: string[] = [`Search results for: "${args.query}"`, ""];

    if (data.answer) {
      lines.push("Quick Answer:");
      lines.push(data.answer);
      lines.push("");
    }

    lines.push("Sources:");
    for (const result of data.results) {
      lines.push(`- **${result.title}**`);
      lines.push(`  URL: ${result.url}`);
      lines.push(`  ${result.content.slice(0, 300)}...`);
      lines.push("");
    }

    return {
      toolCallId,
      result: lines.join("\n"),
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      result: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

/**
 * Execute URL reading using fetch + DOMParser (browser-native)
 * Uses browser's built-in DOMParser instead of jsdom for compatibility
 */
async function executeReadUrl(
  toolCallId: string,
  args: { url: string }
): Promise<ToolResult> {
  if (!args.url?.trim()) {
    return {
      toolCallId,
      result: "No URL provided.",
      success: false,
    };
  }

  // Validate URL
  try {
    const parsedUrl = new URL(args.url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported");
    }
  } catch {
    return {
      toolCallId,
      result: `Invalid URL: ${args.url}`,
      success: false,
    };
  }

  try {
    // Use Tauri's HTTP plugin to bypass CORS
    const response = await tauriFetch(args.url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Continuity/1.0; +https://continuity.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Use browser's native DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract title
    const title = doc.querySelector("title")?.textContent?.trim() || "Untitled";

    // Remove scripts, styles, and other non-content elements
    const elementsToRemove = doc.querySelectorAll(
      "script, style, nav, header, footer, aside, iframe, noscript, svg, [role='navigation'], [role='banner'], [role='contentinfo']"
    );
    elementsToRemove.forEach((el) => el.remove());

    // Try to find main content area
    const mainContent =
      doc.querySelector("main") ||
      doc.querySelector("article") ||
      doc.querySelector('[role="main"]') ||
      doc.querySelector(".content") ||
      doc.querySelector("#content") ||
      doc.body;

    if (!mainContent) {
      return {
        toolCallId,
        result: `Could not extract content from: ${args.url}`,
        success: false,
      };
    }

    // Extract text content
    let textContent = mainContent.textContent || "";

    // Clean up whitespace
    textContent = textContent
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim()
      .slice(0, 8000); // Limit content length

    // Format the result
    const lines: string[] = [
      `Content from: ${args.url}`,
      "",
      `# ${title}`,
      "",
      textContent,
    ];

    return {
      toolCallId,
      result: lines.join("\n"),
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      result: `Failed to read URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

/**
 * Get current date and time
 */
async function executeGetCurrentTime(
  toolCallId: string,
  args: { timezone?: string }
): Promise<ToolResult> {
  try {
    const now = new Date();

    // Format options
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "long",
    };

    // Add timezone if specified
    if (args.timezone) {
      options.timeZone = args.timezone;
    }

    const formatter = new Intl.DateTimeFormat("en-US", options);
    const formattedDate = formatter.format(now);

    // Also provide structured data
    const result = {
      formatted: formattedDate,
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezone: args.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return {
      toolCallId,
      result: `Current time: ${result.formatted}\nISO: ${result.iso}\nTimezone: ${result.timezone}`,
      success: true,
    };
  } catch (error) {
    return {
      toolCallId,
      result: `Failed to get time: ${error instanceof Error ? error.message : "Invalid timezone"}`,
      success: false,
    };
  }
}

// ============================================
// SYSTEM PROMPT ADDITION FOR WEB TOOLS
// ============================================

export const WEB_TOOLS_SYSTEM_PROMPT = `
You have tools for web access and time awareness:

1. **web_search** - Search the internet for current information. Use this when:
   - User asks about current events or recent information
   - You need to research a topic
   - You need to verify or fact-check something
   - Looking for documentation or tutorials

2. **read_url** - Read content from a specific web page. Use this when:
   - User shares a URL and asks you to summarize or analyze it
   - You need to read a specific article or documentation page
   - Following up on a search result

3. **get_current_time** - Get the current date and time. Use this when:
   - User asks "what time is it?" or "what's today's date?"
   - Setting deadlines or scheduling
   - Time-sensitive calculations

## Important guidelines:

- Use web_search for general queries, read_url for specific pages
- Always cite sources when using search results
- Be aware that web content may be outdated or incorrect
`.trim();
