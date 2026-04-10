import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  buildTestApp,
  makeMemory,
  authHeaders,
  type TestHarness,
} from "./helpers.js";

describe("GET /api/memories (pull)", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });
  afterEach(async () => {
    await h.close();
  });

  it("returns [] when DB is empty", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ memories: [] });
  });

  it("returns all memories when called without since", async () => {
    await h.app.inject({
      method: "POST",
      url: "/api/memories/batch",
      headers: authHeaders,
      payload: {
        memories: [
          makeMemory({ key: "a" }),
          makeMemory({ key: "b" }),
          makeMemory({ key: "c" }),
        ],
      },
    });

    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = res.json() as { memories: unknown[] };
    expect(body.memories).toHaveLength(3);
  });

  it("returns [] when since is in the future", async () => {
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({ key: "k1" }),
    });

    const future = "2099-01-01T00:00:00.000Z";
    const res = await h.app.inject({
      method: "GET",
      url: `/api/memories?since=${encodeURIComponent(future)}`,
      headers: authHeaders,
    });
    expect(res.json()).toEqual({ memories: [] });
  });

  it("is monotonic: pull returns only memories written AFTER since cursor", async () => {
    // Push memory A
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({ key: "A", content: "first" }),
    });

    // Small pause so received_at differs between inserts.
    // The strftime('%f') format gives us millisecond precision, so 10ms
    // is plenty of headroom.
    await new Promise((r) => setTimeout(r, 10));

    // Capture a cursor — a timestamp strictly between the two inserts
    const cursor = new Date().toISOString();

    await new Promise((r) => setTimeout(r, 10));

    // Push memory B
    await h.app.inject({
      method: "POST",
      url: "/api/memories",
      headers: authHeaders,
      payload: makeMemory({ key: "B", content: "second" }),
    });

    // Pull since cursor should return only B
    const res = await h.app.inject({
      method: "GET",
      url: `/api/memories?since=${encodeURIComponent(cursor)}`,
      headers: authHeaders,
    });
    const body = res.json() as { memories: Array<{ key: string }> };
    expect(body.memories).toHaveLength(1);
    expect(body.memories[0].key).toBe("B");
  });

  it("returns memories in received_at ascending order", async () => {
    for (const key of ["first", "second", "third"]) {
      await h.app.inject({
        method: "POST",
        url: "/api/memories",
        headers: authHeaders,
        payload: makeMemory({ key }),
      });
      await new Promise((r) => setTimeout(r, 5));
    }

    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: authHeaders,
    });
    const body = res.json() as { memories: Array<{ key: string }> };
    expect(body.memories.map((m) => m.key)).toEqual(["first", "second", "third"]);
  });
});
