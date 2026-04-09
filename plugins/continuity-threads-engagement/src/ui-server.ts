/**
 * UI Server
 *
 * Express server that serves the dashboard SPA and provides
 * a JSON API for the frontend to interact with.
 */

import express from "express";
import { createServer } from "net";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ThreadsAPI } from "./threads-api.js";
import { AIEvaluator } from "./ai-evaluator.js";
import { CronScheduler } from "./cron.js";
import {
  getStats,
  getPostsByStatus,
  getPostById,
  updatePostStatus,
  getDraftsForPost,
  updateDraftText,
  selectDraft,
  getSelectedDraft,
  deleteDraftsForPost,
  insertDraft,
  insertEngagement,
  updateEngagement,
  countPostsByStatus,
} from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Find an available port on localhost */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Could not find free port"));
      }
    });
    server.on("error", reject);
  });
}

interface UIServerDeps {
  threadsApi: ThreadsAPI | null;
  ai: AIEvaluator | null;
  cron: CronScheduler | null;
}

export async function startUIServer(
  initialDeps: UIServerDeps
): Promise<{ port: number; close: () => void; setDeps: (d: UIServerDeps) => void }> {
  let deps = initialDeps;
  const app = express();

  app.use(express.json());

  // CORS for iframe context
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // ── Static Files ────────────────────────────

  const uiDir = join(__dirname, "..", "ui");
  app.use("/ui", express.static(uiDir));
  app.get("/ui", (_req, res) => {
    res.sendFile(join(uiDir, "index.html"));
  });

  // ── API: Plugin Status ───────────────────────

  app.get("/api/status", (_req, res) => {
    res.json({
      configured: !!(deps.threadsApi && deps.ai && deps.cron),
      message: deps.threadsApi
        ? "Plugin is active and monitoring Threads."
        : "Plugin needs configuration. Go to Settings > Plugins > Threads Engagement > Configure.",
    });
  });

  // ── API: Stats ──────────────────────────────

  app.get("/api/stats", (_req, res) => {
    res.json(getStats());
  });

  // ── API: Posts ──────────────────────────────

  app.get("/api/posts", (req, res) => {
    const status = (req.query.status as string) || "all";
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const posts = getPostsByStatus(status, limit, offset);
    const total = countPostsByStatus(status);

    // Attach drafts to each post
    const postsWithDrafts = posts.map((post) => ({
      ...post,
      drafts: getDraftsForPost(post.id),
    }));

    res.json({
      posts: postsWithDrafts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  });

  app.get("/api/posts/:id", (req, res) => {
    const post = getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json({
      ...post,
      drafts: getDraftsForPost(post.id),
    });
  });

  // ── API: Post Actions ───────────────────────

  app.put("/api/posts/:id/status", (req, res) => {
    const { status } = req.body;
    if (!["approved", "rejected", "skipped", "pending", "drafted"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    updatePostStatus(req.params.id, status);
    res.json({ success: true });
  });

  app.post("/api/posts/:id/approve", async (req, res) => {
    if (!deps.threadsApi) return res.status(503).json({ error: "Plugin not configured" });

    const post = getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Get the selected draft (or first draft)
    let draft = getSelectedDraft(post.id);
    if (!draft) {
      const drafts = getDraftsForPost(post.id);
      draft = drafts[0];
    }

    if (!draft) {
      return res.status(400).json({ error: "No draft available to post" });
    }

    // Create engagement record
    const engagementId = insertEngagement(post.id, draft.id, draft.draft_text);

    try {
      // Post to Threads
      const replyId = await deps.threadsApi.postReply(post.id, draft.draft_text);

      // Update records
      updateEngagement(engagementId, {
        threads_reply_id: replyId,
        posted_at: new Date().toISOString(),
        status: "posted",
      });
      updatePostStatus(post.id, "replied");

      res.json({ success: true, replyId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      updateEngagement(engagementId, { status: "failed", error: message });
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/posts/:id/regenerate", async (req, res) => {
    if (!deps.ai) return res.status(503).json({ error: "Plugin not configured" });

    const post = getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    try {
      // Delete old drafts
      deleteDraftsForPost(post.id);

      // Generate new ones
      const result = await deps.ai.draftReplies({
        id: post.id,
        text: post.text,
        username: post.username,
        timestamp: post.posted_at,
        permalink: post.permalink || "",
        media_type: post.media_type || "TEXT_POST",
      });

      for (let i = 0; i < result.drafts.length; i++) {
        insertDraft(post.id, result.drafts[i], i + 1);
      }

      updatePostStatus(post.id, "drafted");

      res.json({
        success: true,
        drafts: getDraftsForPost(post.id),
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Draft generation failed" });
    }
  });

  // ── API: Drafts ─────────────────────────────

  app.put("/api/drafts/:id", (req, res) => {
    const { text } = req.body;
    if (typeof text !== "string") return res.status(400).json({ error: "text required" });
    updateDraftText(req.params.id, text);
    res.json({ success: true });
  });

  app.post("/api/drafts/:postId/select", (req, res) => {
    const { draftId } = req.body;
    if (typeof draftId !== "string") return res.status(400).json({ error: "draftId required" });
    selectDraft(draftId, req.params.postId);
    res.json({ success: true });
  });

  // ── API: Scan ───────────────────────────────

  app.post("/api/scan", async (_req, res) => {
    if (!deps.cron) return res.status(503).json({ error: "Plugin not configured" });
    try {
      const result = await deps.cron.triggerManualScan();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Scan failed" });
    }
  });

  // ── Start Server ────────────────────────────

  const port = await findFreePort();

  return new Promise((resolve) => {
    const server = app.listen(port, "127.0.0.1", () => {
      console.log(`[UI] Server listening on http://127.0.0.1:${port}/ui`);
      resolve({
        port,
        close: () => server.close(),
        setDeps: (newDeps: UIServerDeps) => { deps = newDeps; },
      });
    });
  });
}
