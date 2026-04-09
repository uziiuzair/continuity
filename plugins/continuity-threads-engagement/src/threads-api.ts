/**
 * Threads API Client
 *
 * Wraps the official Meta Threads Graph API for search, reply posting,
 * and token management.
 *
 * API docs: https://developers.facebook.com/docs/threads
 */

const BASE_URL = "https://graph.threads.net/v1.0";

export interface ThreadsPost {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  permalink: string;
  media_type: string;
}

interface ThreadsSearchResponse {
  data: ThreadsPost[];
  paging?: { cursors: { after: string }; next: string };
}

export class ThreadsAPI {
  private accessToken: string;
  private userId: string;

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  /** Update the access token (e.g., after refresh) */
  setToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Search public Threads posts by keyword.
   * Rate limit: 500 searches per 7-day rolling window.
   */
  async search(keyword: string, limit = 25): Promise<ThreadsPost[]> {
    const params = new URLSearchParams({
      q: keyword,
      fields: "id,text,username,timestamp,permalink,media_type",
      limit: String(limit),
      access_token: this.accessToken,
    });

    const response = await fetch(`${BASE_URL}/threads/search?${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ThreadsAPIError(
        `Search failed: ${response.status}`,
        response.status,
        error
      );
    }

    const data = (await response.json()) as ThreadsSearchResponse;
    return data.data || [];
  }

  /**
   * Post a reply to a Threads post.
   * Two-step: create container → publish.
   * Replies don't count against the 250 posts/day limit.
   */
  async postReply(replyToId: string, text: string): Promise<string> {
    // Step 1: Create media container
    const containerResponse = await fetch(`${BASE_URL}/${this.userId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "TEXT",
        text,
        reply_to_id: replyToId,
        access_token: this.accessToken,
      }),
    });

    if (!containerResponse.ok) {
      const error = await containerResponse.json().catch(() => ({}));
      throw new ThreadsAPIError(
        `Create reply container failed: ${containerResponse.status}`,
        containerResponse.status,
        error
      );
    }

    const container = (await containerResponse.json()) as { id: string };

    // Step 2: Publish
    const publishResponse = await fetch(
      `${BASE_URL}/${this.userId}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: this.accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json().catch(() => ({}));
      throw new ThreadsAPIError(
        `Publish reply failed: ${publishResponse.status}`,
        publishResponse.status,
        error
      );
    }

    const published = (await publishResponse.json()) as { id: string };
    return published.id;
  }

  /**
   * Refresh a long-lived token before it expires (60-day lifespan).
   * Should be called when token has < 14 days remaining.
   * Returns the new token string.
   */
  async refreshToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "th_refresh_token",
      access_token: this.accessToken,
    });

    const response = await fetch(
      `${BASE_URL}/refresh_access_token?${params}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ThreadsAPIError(
        `Token refresh failed: ${response.status}`,
        response.status,
        error
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    return data.access_token;
  }

  /**
   * Verify the token is still valid by fetching the user's profile.
   */
  async verifyToken(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        fields: "id,username",
        access_token: this.accessToken,
      });
      const response = await fetch(`${BASE_URL}/me?${params}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export class ThreadsAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiError: unknown
  ) {
    super(message);
    this.name = "ThreadsAPIError";
  }
}
