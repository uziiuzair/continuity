import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { buildTestApp, type TestHarness } from "./helpers.js";

describe("authentication", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });

  afterEach(async () => {
    await h.close();
  });

  it("allows /api/health without any Authorization header", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it("rejects /api/memories without Authorization header", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/memories" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects /api/memories with wrong bearer token", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: { authorization: "Bearer wrong-key" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects /api/memories with malformed Authorization header", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: { authorization: "test-key-123" }, // missing "Bearer " prefix
    });
    expect(res.statusCode).toBe(401);
  });

  it("accepts /api/memories with correct bearer token", async () => {
    const res = await h.app.inject({
      method: "GET",
      url: "/api/memories",
      headers: { authorization: "Bearer test-key-123" },
    });
    expect(res.statusCode).toBe(200);
  });
});
