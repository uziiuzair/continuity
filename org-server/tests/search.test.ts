import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  buildTestApp,
  makeMemory,
  authHeaders,
  type TestHarness,
} from "./helpers.js";

describe("GET /api/memories/search", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });
  afterEach(async () => {
    await h.close();
  });

  it("returns empty result on empty DB", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=anything",
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ memories: [], total: 0 });
  });

  it("matches query in the `key` field", async () => {
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({ key: "widget-pricing-decision", content: "whatever" }),
    });

    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=widget",
      headers: authHeaders,
    });
    const body = res.json() as { memories: unknown[]; total: number };
    expect(body.total).toBe(1);
    expect(body.memories).toHaveLength(1);
  });

  it("matches query in the `content` field", async () => {
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({
        key: "k1",
        content: "We decided to use PostgreSQL for the primary store",
      }),
    });

    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=PostgreSQL",
      headers: authHeaders,
    });
    const body = res.json() as { memories: unknown[]; total: number };
    expect(body.total).toBe(1);
  });

  it("matches query in the `tags` field", async () => {
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({ key: "k1", tags: "architecture,database" }),
    });

    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=database",
      headers: authHeaders,
    });
    const body = res.json() as { memories: unknown[]; total: number };
    expect(body.total).toBe(1);
  });

  it("respects the limit parameter", async () => {
    // Insert 5 matching memories
    await h.app.inject({
      method: "POST",
      url: "/api/memories/batch",
      headers: authHeaders,
      payload: {
        memories: [1, 2, 3, 4, 5].map((i) =>
          makeMemory({ key: `match-${i}`, content: "findme" })
        ),
      },
    });

    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=findme&limit=2",
      headers: authHeaders,
    });
    const body = res.json() as { memories: unknown[]; total: number };
    expect(body.memories).toHaveLength(2);
    // total reflects the full match count, not the paged count
    expect(body.total).toBe(5);
  });

  it("rejects missing q parameter with 400", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search",
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects empty q parameter with 400", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories/search?q=",
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(400);
  });
});
