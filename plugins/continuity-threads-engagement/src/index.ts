/**
 * Continuity Threads Engagement Plugin
 *
 * Finds relevant Threads posts, scores them with AI, drafts replies,
 * and presents a dashboard for review and approval.
 *
 * Flow:
 *   Cron → Threads API search → AI scoring → AI drafting → Sidebar dashboard
 *   User reviews → approves → Threads API posts reply
 */

import { ContinuityPlugin } from "@continuity/plugin-sdk";
import { ThreadsAPI } from "./threads-api.js";
import { AIEvaluator } from "./ai-evaluator.js";
import { CronScheduler } from "./cron.js";
import { startUIServer } from "./ui-server.js";
import { getDb, getStats, closeDb } from "./db.js";

async function main() {
  const plugin = new ContinuityPlugin();

  plugin.declareCapabilities([
    "db:read",
    "ui:sidebar",
    "ui:notifications",
    "chat:tools",
    "chat:prompts",
  ]);

  await plugin.start();

  // Ensure local DB is ready (creates tables if needed)
  getDb();

  // ── Always start UI server + register sidebar ──

  // Start UI server first so the sidebar panel is always visible,
  // even if the plugin isn't fully configured yet.
  // Pass null deps — the UI server handles the unconfigured state gracefully.
  const uiServer = await startUIServer({
    threadsApi: null,
    ai: null,
    cron: null,
  });

  await plugin.ui.registerPanel({
    slot: "sidebar",
    label: "Threads",
    icon: "message-circle",
    url: `http://127.0.0.1:${uiServer.port}/ui`,
  });

  console.log(`[Threads] Sidebar panel registered at http://127.0.0.1:${uiServer.port}/ui`);

  // ── Load Settings ───────────────────────

  const settings = await plugin.settings.getAll();
  const threadsToken = settings.threads_access_token as string;
  const threadsUserId = settings.threads_user_id as string;
  const searchKeywords = settings.search_keywords as string;
  const persona = settings.persona_description as string;
  const relevanceThreshold = (settings.relevance_threshold as number) || 6;
  const cronIntervalHours = (settings.cron_interval_hours as number) || 12;
  const maxSearchesPerRun = (settings.max_searches_per_run as number) || 5;

  if (!threadsToken || !threadsUserId || !searchKeywords || !persona) {
    console.log("[Threads] Missing required settings — UI available, features disabled.");
    await plugin.ui.showNotification({
      title: "Threads Engagement",
      message: "Go to Settings > Plugins > Configure to set your Threads token, keywords, and persona.",
      type: "warning",
    });
    // Keep alive — sidebar panel is visible, user can configure
    return;
  }

  const keywords = searchKeywords.split(",").map((k) => k.trim()).filter(Boolean);

  // ── Read AI Config from App DB ──────────

  let aiProvider = "openai";
  let aiModel = "gpt-4o";
  let aiApiKey = "";

  try {
    const rows = await plugin.db.query<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE key IN (?, ?, ?)",
      ["ai_provider", "ai_model", "ai_api_key"]
    );

    for (const row of rows) {
      if (row.key === "ai_provider") aiProvider = row.value;
      if (row.key === "ai_model") aiModel = row.value;
      if (row.key === "ai_api_key") aiApiKey = row.value;
    }
  } catch (err) {
    console.error("[Threads] Failed to read AI config from app DB:", err);
  }

  if (!aiApiKey) {
    await plugin.ui.showNotification({
      title: "Threads Engagement",
      message: "No AI API key found in Continuity settings. Configure an OpenAI or Anthropic key first.",
      type: "error",
    });
    return;
  }

  // ── Initialize Components ───────────────

  const threadsApi = new ThreadsAPI(threadsToken, threadsUserId);
  const ai = new AIEvaluator({
    provider: aiProvider,
    model: aiModel,
    apiKey: aiApiKey,
    persona,
    keywords: searchKeywords,
  });

  // Verify Threads token
  const tokenValid = await threadsApi.verifyToken();
  if (!tokenValid) {
    await plugin.ui.showNotification({
      title: "Threads Engagement",
      message: "Threads access token is invalid or expired. Update it in Settings > Plugins.",
      type: "error",
    });
    // Still keep the sidebar panel visible
    return;
  }

  // Start cron scheduler
  const cron = new CronScheduler({
    plugin,
    threadsApi,
    ai,
    keywords,
    intervalHours: cronIntervalHours,
    maxSearchesPerRun,
    relevanceThreshold,
  });

  // Update the UI server with the real dependencies now that they're ready
  uiServer.setDeps({ threadsApi, ai, cron });

  // ── Register Chat Tools ─────────────────

  await plugin.chat.registerTool({
    name: "search_threads_posts",
    description:
      "Search for relevant Threads posts by keyword. Returns posts with AI relevance scores. Use when the user wants to find Threads conversations to engage with.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword or topic" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const query = args.query as string;
      const limit = (args.limit as number) || 10;

      try {
        const posts = await threadsApi.search(query, limit);
        if (posts.length === 0) {
          return { content: `No Threads posts found for "${query}".` };
        }

        const scores = await ai.scoreRelevance(posts);
        const scoreMap = new Map(scores.map((s) => [s.postId, s]));

        const formatted = posts
          .map((p) => {
            const score = scoreMap.get(p.id);
            return `@${p.username} (score: ${score?.score?.toFixed(1) || "?"}): "${p.text}"\n  → ${score?.reason || "No score"}\n  Link: ${p.permalink}`;
          })
          .join("\n\n");

        return { content: `Found ${posts.length} Threads posts for "${query}":\n\n${formatted}` };
      } catch (err) {
        return { content: `Search failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
      }
    },
  });

  await plugin.chat.registerTool({
    name: "get_threads_engagement_summary",
    description:
      "Get a summary of Threads engagement activity: pending reviews, recent replies, search budget, and stats.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const stats = getStats();
      return {
        content: [
          "**Threads Engagement Summary**",
          `- Pending review: ${stats.pendingReview} posts`,
          `- Total discovered: ${stats.totalDiscovered}`,
          `- Replies posted: ${stats.totalReplied}`,
          `- Rejected/skipped: ${stats.totalRejected}`,
          `- Search budget: ${stats.searchBudgetRemaining}/500 remaining this week`,
          `- Last scan: ${stats.lastScanAt || "Never"}`,
        ].join("\n"),
      };
    },
  });

  await plugin.chat.registerTool({
    name: "draft_threads_reply",
    description:
      "Draft a reply to a specific Threads post. Provide the post text and optionally the author. Returns AI-generated reply options.",
    parameters: {
      type: "object",
      properties: {
        post_text: { type: "string", description: "The Threads post text to reply to" },
        post_username: { type: "string", description: "The author's username" },
        tone: { type: "string", description: "Optional tone (e.g., casual, professional, witty)" },
      },
      required: ["post_text"],
    },
    handler: async (args) => {
      const postText = args.post_text as string;
      const username = (args.post_username as string) || "someone";
      const tone = args.tone as string | undefined;

      try {
        const reply = await ai.draftSingleReply(postText, username, tone);
        return { content: `**Draft reply to @${username}:**\n\n${reply}` };
      } catch (err) {
        return { content: `Draft failed: ${err instanceof Error ? err.message : "Unknown error"}`, isError: true };
      }
    },
  });

  // ── Inject Context Prompt ───────────────

  await plugin.chat.injectPrompt({
    id: "threads-engagement-context",
    content: [
      "This user has the Threads Engagement plugin active.",
      `They monitor Threads for posts about: ${searchKeywords}.`,
      "You can help them by:",
      "- Searching for Threads posts on any topic (search_threads_posts)",
      "- Getting their engagement summary and pending reviews (get_threads_engagement_summary)",
      "- Drafting custom replies to posts (draft_threads_reply)",
      "The user always reviews replies before posting. Never post without their approval.",
    ].join(" "),
    position: "context",
  });

  // ── Start Cron ──────────────────────────

  await cron.start();

  // ── Startup Notification ────────────────

  const stats = getStats();
  await plugin.ui.showNotification({
    title: "Threads Engagement",
    message: `Active! Monitoring ${keywords.length} topic${keywords.length > 1 ? "s" : ""}. ${stats.pendingReview} posts pending review.`,
    type: "success",
  });

  if (stats.pendingReview > 0) {
    await plugin.ui.updateBadge("sidebar", stats.pendingReview);
  }

  console.log(`[Threads] Plugin fully initialized`);

  // ── Graceful Shutdown ───────────────────

  const shutdown = () => {
    cron.stop();
    uiServer.close();
    closeDb();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[Threads] Fatal error:", err);
  process.exit(1);
});
