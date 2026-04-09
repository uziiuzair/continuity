/**
 * Org Server API Client
 *
 * HTTP client for communicating with the organization's
 * central memory server.
 */

export interface OrgMemory {
  id: string;
  key: string;
  content: string;
  type: string;
  scope: string;
  tags: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OrgSearchResult {
  memories: OrgMemory[];
  total: number;
}

export class OrgAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Org API error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  /** Push a memory to the org server */
  async pushMemory(memory: OrgMemory): Promise<void> {
    await this.fetch("/api/memories", {
      method: "POST",
      body: JSON.stringify(memory),
    });
  }

  /** Push multiple memories in a batch */
  async pushMemories(memories: OrgMemory[]): Promise<void> {
    await this.fetch("/api/memories/batch", {
      method: "POST",
      body: JSON.stringify({ memories }),
    });
  }

  /** Pull memories updated since a timestamp */
  async pullMemories(since?: string): Promise<OrgMemory[]> {
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    const response = await this.fetch(`/api/memories${params}`);
    const data = await response.json();
    return data.memories;
  }

  /** Search org memories */
  async search(query: string, limit = 10): Promise<OrgSearchResult> {
    const response = await this.fetch(
      `/api/memories/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return await response.json();
  }

  /** Check connection to org server */
  async ping(): Promise<boolean> {
    try {
      await this.fetch("/api/health");
      return true;
    } catch {
      return false;
    }
  }
}
