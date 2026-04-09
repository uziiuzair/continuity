/**
 * Cron Scheduler
 *
 * Runs the search → score → draft pipeline on a configurable interval.
 */

import type { ContinuityPlugin } from "@continuity/plugin-sdk";
import { ThreadsAPI, type ThreadsPost } from "./threads-api.js";
import { AIEvaluator } from "./ai-evaluator.js";
import {
  postExists,
  insertPost,
  updatePostStatus,
  insertDraft,
  logSearch,
  getSearchCountLast7Days,
  getStats,
} from "./db.js";

export class CronScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isScanning = false;
  private plugin: ContinuityPlugin;
  private threadsApi: ThreadsAPI;
  private ai: AIEvaluator;
  private keywords: string[];
  private intervalHours: number;
  private maxSearchesPerRun: number;
  private relevanceThreshold: number;

  constructor(config: {
    plugin: ContinuityPlugin;
    threadsApi: ThreadsAPI;
    ai: AIEvaluator;
    keywords: string[];
    intervalHours: number;
    maxSearchesPerRun: number;
    relevanceThreshold: number;
  }) {
    this.plugin = config.plugin;
    this.threadsApi = config.threadsApi;
    this.ai = config.ai;
    this.keywords = config.keywords;
    this.intervalHours = config.intervalHours;
    this.maxSearchesPerRun = config.maxSearchesPerRun;
    this.relevanceThreshold = config.relevanceThreshold;
  }

  /** Start the cron: immediate scan + interval */
  async start(): Promise<void> {
    console.log(`[Cron] Starting (interval: ${this.intervalHours}h, keywords: ${this.keywords.length})`);

    // Run immediately
    await this.runScan();

    // Schedule recurring
    this.timer = setInterval(
      () => this.runScan(),
      this.intervalHours * 60 * 60 * 1000
    );
  }

  /** Stop the cron */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Trigger a manual scan (from UI) */
  async triggerManualScan(): Promise<{ newPosts: number }> {
    return this.runScan();
  }

  /** The full scan pipeline */
  async runScan(): Promise<{ newPosts: number }> {
    if (this.isScanning) {
      console.log("[Cron] Scan already in progress, skipping");
      return { newPosts: 0 };
    }

    this.isScanning = true;
    let newPostCount = 0;

    try {
      // Step 1: Rate limit check
      const searchesUsed = getSearchCountLast7Days();
      if (searchesUsed >= 490) {
        console.warn(`[Cron] Near search rate limit (${searchesUsed}/500 this week). Skipping.`);
        await this.plugin.ui.showNotification({
          title: "Threads Engagement",
          message: `Search budget nearly exhausted (${searchesUsed}/500 this week). Skipping scan.`,
          type: "warning",
        });
        return { newPosts: 0 };
      }

      // Step 2: Search each keyword
      const allNewPosts: (ThreadsPost & { keyword: string })[] = [];
      const keywordsToSearch = this.keywords.slice(0, this.maxSearchesPerRun);

      for (const keyword of keywordsToSearch) {
        try {
          console.log(`[Cron] Searching: "${keyword}"`);
          const posts = await this.threadsApi.search(keyword, 25);
          logSearch(keyword, posts.length);

          // Deduplicate against existing DB entries
          const newPosts = posts.filter((p) => !postExists(p.id));
          for (const post of newPosts) {
            allNewPosts.push({ ...post, keyword });
          }

          console.log(`[Cron] "${keyword}": ${posts.length} found, ${newPosts.length} new`);
        } catch (err) {
          console.error(`[Cron] Search failed for "${keyword}":`, err);
        }
      }

      if (allNewPosts.length === 0) {
        console.log("[Cron] No new posts found");
        return { newPosts: 0 };
      }

      // Step 3: AI relevance scoring (batch)
      console.log(`[Cron] Scoring ${allNewPosts.length} new posts...`);
      const scores = await this.ai.scoreRelevance(allNewPosts);

      // Map scores by post ID
      const scoreMap = new Map(scores.map((s) => [s.postId, s]));

      // Filter and insert qualifying posts
      const qualifyingPosts: (ThreadsPost & { keyword: string })[] = [];
      for (const post of allNewPosts) {
        const score = scoreMap.get(post.id);
        if (score && score.score >= this.relevanceThreshold) {
          insertPost({
            id: post.id,
            text: post.text,
            username: post.username,
            permalink: post.permalink,
            media_type: post.media_type,
            posted_at: post.timestamp,
            search_keyword: post.keyword,
            relevance_score: score.score,
            relevance_reason: score.reason,
          });
          qualifyingPosts.push(post);
        }
      }

      console.log(`[Cron] ${qualifyingPosts.length}/${allNewPosts.length} posts passed relevance threshold`);

      // Step 4: AI draft replies for each qualifying post
      for (const post of qualifyingPosts) {
        try {
          const result = await this.ai.draftReplies(post);
          for (let i = 0; i < result.drafts.length; i++) {
            insertDraft(post.id, result.drafts[i], i + 1);
          }
          updatePostStatus(post.id, "drafted");
          newPostCount++;
        } catch (err) {
          console.error(`[Cron] Draft failed for post ${post.id}:`, err);
        }
      }

      // Step 5: Notify
      if (newPostCount > 0) {
        const stats = getStats();
        await this.plugin.ui.updateBadge("sidebar", stats.pendingReview);
        await this.plugin.ui.showNotification({
          title: "Threads Engagement",
          message: `Found ${newPostCount} new post${newPostCount > 1 ? "s" : ""} to engage with!`,
          type: "success",
        });
      }

      console.log(`[Cron] Scan complete. ${newPostCount} new posts with drafts.`);
      return { newPosts: newPostCount };
    } catch (err) {
      console.error("[Cron] Scan failed:", err);
      return { newPosts: 0 };
    } finally {
      this.isScanning = false;
    }
  }
}
