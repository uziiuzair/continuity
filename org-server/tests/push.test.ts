import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  buildTestApp,
  makeMemory,
  authHeaders,
  type TestHarness,
} from "./helpers.js";

describe("POST /api/memories (single push)", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });
  afterEach(async () => {
    await h.close();
  });

  it("inserts a valid memory and returns ok", async () => {
    const memory = makeMemory({ key: "k1", content: "hello world" });
    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: memory,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // Verify via pull
    const pullRes = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = pullRes.json() as { memories: unknown[] };
    expect(body.memories).toHaveLength(1);
    expect(body.memories[0]).toMatchObject({ key: "k1", content: "hello world" });
  });

  it("returns 400 when required field is missing", async () => {
    const memory = makeMemory();
    const { key: _key, ...invalid } = memory; // drop required field
    void _key;
    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: invalid,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid payload" });
  });

  it("upsert: newer updated_at overwrites existing content", async () => {
    const original = makeMemory({
      key: "upsert-key",
      content: "old content",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: original,
    });

    const updated = makeMemory({
      key: "upsert-key",
      content: "new content",
      updated_at: "2026-06-01T00:00:00.000Z",
    });
    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: updated,
    });
    expect(res.statusCode).toBe(200);

    const pullRes = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = pullRes.json() as {
      memories: Array<{ key: string; content: string }>;
    };
    expect(body.memories).toHaveLength(1);
    expect(body.memories[0].content).toBe("new content");
  });

  it("upsert: older updated_at is rejected (row unchanged)", async () => {
    const original = makeMemory({
      key: "stale-key",
      content: "current content",
      updated_at: "2026-06-01T00:00:00.000Z",
    });
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: original,
    });

    // Try to write an older version
    const stale = makeMemory({
      key: "stale-key",
      content: "old content that should be rejected",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: stale,
    });
    // Note: the endpoint still returns 200 — the stale write is a no-op,
    // not an error. Clients don't need to do anything special on stale
    // writes; the server just silently keeps the newer version.
    expect(res.statusCode).toBe(200);

    const pullRes = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = pullRes.json() as {
      memories: Array<{ content: string }>;
    };
    expect(body.memories).toHaveLength(1);
    expect(body.memories[0].content).toBe("current content");
  });
});

describe("POST /api/memories/batch", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });
  afterEach(async () => {
    await h.close();
  });

  it("inserts all 10 memories in a single batch", async () => {
    const memories = Array.from({ length: 10 }, (_, i) =>
      makeMemory({ key: `batch-${i}`, content: `content ${i}` })
    );

    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories/batch",
      headers: authHeaders,
      payload: { memories },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, count: 10 });

    const pullRes = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = pullRes.json() as { memories: unknown[] };
    expect(body.memories).toHaveLength(10);
  });

  it("rejects the entire batch atomically if any item is invalid", async () => {
    const good = [
      makeMemory({ key: "ok-1" }),
      makeMemory({ key: "ok-2" }),
    ];
    // Invalid: missing required `key` field
    const bad = { ...makeMemory({ key: "will-be-removed" }), key: undefined };
    const memories = [...good, bad];

    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories/batch",
      headers: authHeaders,
      payload: { memories },
    });
    expect(res.statusCode).toBe(400);

    // NONE of the memories should have been inserted — atomic failure
    const pullRes = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = pullRes.json() as { memories: unknown[] };
    expect(body.memories).toHaveLength(0);
  });

  it("returns ok:true with count 0 for empty batch", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/memories/batch",
      headers: authHeaders,
      payload: { memories: [] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, count: 0 });
  });
});
