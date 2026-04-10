import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { buildTestApp, type TestHarness } from "./helpers.js";

describe("GET /api/health", () => {
  let h: TestHarness;

  beforeEach(async () => {
    h = await buildTestApp();
  });

  afterEach(async () => {
    await h.close();
  });

  it("returns 200 with { ok: true }", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
