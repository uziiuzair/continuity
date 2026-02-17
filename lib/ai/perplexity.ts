/**
 * Perplexity Sonar API Client
 *
 * Uses Perplexity's OpenAI-compatible chat completions endpoint.
 * Returns synthesized answers with citations — ideal for research sub-agents.
 * Uses tauriFetch to bypass CORS restrictions.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export interface PerplexitySearchResult {
  answer: string;
  citations: string[];
  searchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface PerplexityConfig {
  apiKey: string;
  model?: string;
}

export const PERPLEXITY_MODELS = [
  { id: "sonar", name: "Sonar" },
  { id: "sonar-pro", name: "Sonar Pro" },
];

export class PerplexityClient {
  private apiKey: string;
  private model: string;

  constructor(config: PerplexityConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "sonar";
  }

  async search(
    query: string,
    options?: {
      searchDomainFilter?: string[];
      searchRecencyFilter?: "day" | "week" | "month" | "year";
    }
  ): Promise<PerplexitySearchResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "You are a research assistant. Provide accurate, well-sourced answers with specific details and data points. Be thorough but concise.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      return_citations: true,
      return_related_questions: false,
    };

    if (options?.searchDomainFilter?.length) {
      body.search_domain_filter = options.searchDomainFilter;
    }
    if (options?.searchRecencyFilter) {
      body.search_recency_filter = options.searchRecencyFilter;
    }

    const response = await tauriFetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Perplexity API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    const answer = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    // Build search results from citations
    const searchResults = citations.map((url: string, i: number) => ({
      title: `Source ${i + 1}`,
      url,
      snippet: "",
    }));

    return {
      answer,
      citations,
      searchResults,
    };
  }
}
