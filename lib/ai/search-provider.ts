/**
 * Unified Search Provider
 *
 * Abstracts over Perplexity Sonar and Tavily search backends.
 * Auto-selects the best available provider based on configured API keys.
 */

import { getSetting } from "@/lib/db/settings";
import { isTauriContext } from "@/lib/db";
import { PerplexityClient } from "./perplexity";
import { searchWebDirect } from "./web-tools";

export interface SearchResult {
  answer?: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  citations?: string[];
}

export interface SearchProvider {
  search(query: string, maxResults?: number): Promise<SearchResult>;
  name: string;
}

class PerplexityProvider implements SearchProvider {
  name = "perplexity";
  private client: PerplexityClient;

  constructor(apiKey: string) {
    this.client = new PerplexityClient({ apiKey });
  }

  async search(query: string): Promise<SearchResult> {
    const result = await this.client.search(query);
    return {
      answer: result.answer,
      sources: result.searchResults || [],
      citations: result.citations,
    };
  }
}

class TavilyProvider implements SearchProvider {
  name = "tavily";

  async search(query: string, maxResults = 5): Promise<SearchResult> {
    const result = await searchWebDirect(query, maxResults);
    return {
      answer: result.answer,
      sources: result.results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
      })),
    };
  }
}

/**
 * Get the best available search provider.
 * Prefers Perplexity (faster search+synthesis), falls back to Tavily.
 * Returns null if neither is configured.
 */
export async function getSearchProvider(): Promise<SearchProvider | null> {
  if (!isTauriContext()) return null;

  const perplexityKey = await getSetting("perplexity_api_key");
  if (perplexityKey) {
    return new PerplexityProvider(perplexityKey);
  }

  const tavilyKey = await getSetting("tavily_api_key");
  if (tavilyKey) {
    return new TavilyProvider();
  }

  return null;
}
