import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  buildTestApp,
  makeMemory,
  authHeaders,
  type TestHarness,
} from "./helpers.js";

/**
 * End-to-end sanity check that mirrors the sync plugin's real usage pattern:
 * push batch → pull → search → push update → incremental pull.
 *
 * If this test passes, the actual OrgMemorySync plugin should Just Work
 * against this server.
 */
describe("roundtrip (plugin-like usage)", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });
  afterEach(async () => {
    await h.close();
  });

  it("push batch → pull → search → update → incremental pull", async () => {
    // 1. Push 5 memories in a batch (mimics initial sync)
    const initial = [
      makeMemory({ key: "product-strategy", content: "focus on local-first" }),
      makeMemory({ key: "tech-stack", content: "Next.js, Tauri, SQLite" }),
      makeMemory({ key: "auth-decision", content: "Bearer tokens for v1" }),
      makeMemory({ key: "test-framework", content: "vitest over jest" }),
      makeMemory({ key: "release-cadence", content: "weekly to staging" }),
    ];
    const pushRes = await h.app.inject({
      method: "POST",
      url: "/api/memories/batch",
      headers: authHeaders,
      payload: { memories: initial },
    });
    expect(pushRes.statusCode).toBe(200);
    expect(pushRes.json()).toEqual({ ok: true, count: 5 });

    // 2. Pull without since → all 5 memories
    const pullAllRes = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const pullAll = pullAllRes.json() as {
      memories: Array<{ key: string; content: string }>;
    };
    expect(pullAll.memories).toHaveLength(5);

    // 3. Search for a substring that appears in one memory's content
    const searchRes = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=local-first",
      headers: authHeaders,
    });
    const search = searchRes.json() as {
      memories: Array<{ key: string }>;
      total: number;
    };
    expect(search.total).toBe(1);
    expect(search.memories[0].key).toBe("product-strategy");

    // 4. Capture a cursor BEFORE an update
    await new Promise((r) => setTimeout(r, 10));
    const cursor = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 10));

    // 5. Push an update to memory #3 (auth-decision) with newer updated_at
    const updateRes = await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({
        key: "auth-decision",
        content: "Bearer tokens for v1, OAuth for v2",
        updated_at: new Date(Date.now() + 1000).toISOString(), // strictly newer
      }),
    });
    expect(updateRes.statusCode).toBe(200);

    // 6. Incremental pull with since=cursor → only the updated memory
    const incrementalRes = await h.app.inject({
      method: "GET",
      url: `/api/memories?since=${encodeURIComponent(cursor)}`,
      headers: authHeaders,
    });
    const incremental = incrementalRes.json() as {
      memories: Array<{ key: string; content: string }>;
    };
    expect(incremental.memories).toHaveLength(1);
    expect(incremental.memories[0].key).toBe("auth-decision");
    expect(incremental.memories[0].content).toBe(
      "Bearer tokens for v1, OAuth for v2"
    );
  });
});
