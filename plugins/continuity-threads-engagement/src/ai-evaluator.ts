/**
 * AI Evaluator
 *
 * Uses the user's existing AI provider (read from Continuity's settings DB)
 * to score post relevance and draft reply suggestions.
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ThreadsPost } from "./threads-api.js";

export interface RelevanceResult {
  postId: string;
  score: number;
  reason: string;
}

export interface DraftResult {
  drafts: string[];
}

type AIProvider = "openai" | "anthropic";

export class AIEvaluator {
  private provider: AIProvider;
  private model: string;
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private persona: string;
  private keywords: string;

  constructor(config: {
    provider: string;
    model: string;
    apiKey: string;
    persona: string;
    keywords: string;
  }) {
    this.provider = config.provider as AIProvider;
    this.model = config.model;
    this.persona = config.persona;
    this.keywords = config.keywords;

    if (this.provider === "openai") {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    } else {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    }
  }

  /**
   * Score a batch of posts for relevance to the user's persona and topics.
   * Returns scores 1-10 with reasoning for each post.
   */
  async scoreRelevance(posts: ThreadsPost[]): Promise<RelevanceResult[]> {
    if (posts.length === 0) return [];

    const postList = posts
      .map((p, i) => `${i + 1}. [id: ${p.id}] @${p.username}: "${p.text}"`)
      .join("\n");

    const systemPrompt = `You are a social media relevance evaluator. Score each post for how relevant it is for the user to engage with.

User persona: ${this.persona}
Topics of interest: ${this.keywords}

For each post, evaluate:
- Is the topic relevant to the user's interests?
- Would engaging with this post be authentic given their persona?
- Is this a conversation worth joining?

Return a JSON array (no markdown, just raw JSON):
[{"postId": "the post id", "score": 7.5, "reason": "brief explanation"}]

Score 1-10 where:
- 1-3: Not relevant
- 4-5: Tangentially related
- 6-7: Relevant, could engage authentically
- 8-10: Highly relevant, strong engagement opportunity`;

    const userPrompt = `Score these ${posts.length} posts:\n\n${postList}`;

    const response = await this.chat(systemPrompt, userPrompt);

    try {
      const parsed = JSON.parse(response) as RelevanceResult[];
      return parsed;
    } catch {
      console.error("[AI] Failed to parse relevance scores:", response.slice(0, 200));
      return [];
    }
  }

  /**
   * Draft reply suggestions for a specific post.
   * Generates 2 distinct reply options.
   */
  async draftReplies(post: ThreadsPost): Promise<DraftResult> {
    const systemPrompt = `You are drafting a reply to a Threads post on behalf of this user.

User persona: ${this.persona}

Guidelines:
- Keep replies concise (1-3 sentences, max 500 chars)
- Be authentic to the persona, not salesy or generic
- Add genuine value — insight, a question, a relevant experience
- Match the tone of the original post (casual if casual, technical if technical)
- Never use hashtags unless the original post does

Return a JSON array of 2 distinct reply options (no markdown, just raw JSON):
[{"text": "reply option 1"}, {"text": "reply option 2"}]`;

    const userPrompt = `Draft 2 reply options for this post by @${post.username}:\n\n"${post.text}"`;

    const response = await this.chat(systemPrompt, userPrompt);

    try {
      const parsed = JSON.parse(response) as { text: string }[];
      return { drafts: parsed.map((d) => d.text) };
    } catch {
      console.error("[AI] Failed to parse drafts:", response.slice(0, 200));
      return { drafts: [] };
    }
  }

  /**
   * Generate a reply for an ad-hoc request (from chat tool).
   */
  async draftSingleReply(postText: string, postUsername: string, tone?: string): Promise<string> {
    const systemPrompt = `You are drafting a reply to a Threads post.

User persona: ${this.persona}
${tone ? `Tone override: ${tone}` : ""}

Write a single concise reply (1-3 sentences, max 500 chars). Be authentic, add value.`;

    return await this.chat(systemPrompt, `Reply to @${postUsername}:\n\n"${postText}"`);
  }

  private async chat(systemPrompt: string, userMessage: string): Promise<string> {
    if (this.provider === "openai" && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content || "";
    }

    if (this.provider === "anthropic" && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    }

    throw new Error(`Unsupported AI provider: ${this.provider}`);
  }
}
