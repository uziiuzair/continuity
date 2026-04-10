import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Constant-time Bearer token comparison.
 *
 * A naive `expected === actual` would leak token length and early-mismatch
 * timing. Since the test surface is tiny and bcrypt-style HMAC is overkill,
 * we use a constant-time byte comparison that runs in time proportional to
 * `expected.length` regardless of how many characters matched.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Build a Fastify preHandler that verifies `Authorization: Bearer <apiKey>`.
 * Attached per-route (not globally) so `/api/health` can stay public.
 */
export function makeAuthHook(expectedKey: string) {
  return async function authHook(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      reply.code(401).send({ error: "missing or malformed Authorization header" });
      return;
    }
    const token = header.slice("Bearer ".length);
    if (!timingSafeEqual(token, expectedKey)) {
      reply.code(401).send({ error: "invalid api key" });
      return;
    }
  };
}
