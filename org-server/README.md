# Continuity Org Server

Self-hostable HTTP server that stores and serves shared organization memories for [Continuity](../README.md). Complements the `continuity-org-memory-sync` plugin, which pushes local memories to this server and pulls shared knowledge from it.

**Role in the stack:**

```
┌──────────────────┐   push/pull    ┌──────────────────┐
│  Continuity app  │ <─────────────>│  Org Server      │
│  (local SQLite)  │   HTTP + Bearer│  (SQLite + HTTP) │
└──────────────────┘                └──────────────────┘
      ↑ each teammate runs a local app    ↑ one per org, self-hosted
```

This server is **optional**. Continuity works 100% offline without it — the org server only exists to let teammates share memories.

> Not to be confused with `/server/` at the repo root, which is the local
> MCP stdio server that lets Claude Code / Cursor / Windsurf talk to your
> local memory DB. Totally different role.

---

## Quick start (Docker — anyone, anywhere)

```bash
cd org-server
cp .env.example .env
# Edit .env and set CONTINUITY_ORG_API_KEY to a strong random value
# (tip: `openssl rand -base64 48`)

docker compose up -d
docker compose logs -f org-server

curl http://localhost:8787/api/health
# → {"ok":true}
```

The SQLite database lives in the named `org-data` volume and persists across `docker compose down` / `up`. To wipe it entirely, `docker compose down -v`.

### Other deployment targets

Same `Dockerfile`, every target:

- **fly.io** — `fly launch` auto-detects the Dockerfile. Create a volume and mount it at `/data`.
- **Railway / Render** — point at this directory, attach a persistent disk at `/data`.
- **Kubernetes** — `Deployment` + `PersistentVolumeClaim` on `/data`, `Service` on port 8787.
- **Plain VPS with Docker** — `docker run -d -p 8787:8787 -v continuity-org-data:/data -e CONTINUITY_ORG_API_KEY=... continuity-org-server`.

---

## Quick start (native Node.js)

```bash
cd org-server
npm install
CONTINUITY_ORG_API_KEY=dev-key-123 npm run dev
# server listens on http://localhost:8787
```

For production: `npm run build && node dist/index.js` (with env vars set).

---

## Environment variables

| Name | Required | Default | Notes |
|---|---|---|---|
| `CONTINUITY_ORG_API_KEY` | **yes** | — | Bearer token plugins authenticate with. Server refuses to start without it. |
| `CONTINUITY_ORG_PORT` | no | `8787` | Port to listen on. |
| `CONTINUITY_ORG_DB_PATH` | no | `./continuity-org.db` (native) / `/data/continuity-org.db` (Docker) | SQLite file path. |

**There is no dev-mode auth bypass.** Preventing accidentally-unauthenticated deployments is worth the small friction.

---

## API

All endpoints except `/api/health` require `Authorization: Bearer <API_KEY>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check. Returns `{ ok: true }`. Public. |
| `POST` | `/api/memories` | Push one memory. Upsert by `(key, scope)`, last-write-wins by `updated_at`. |
| `POST` | `/api/memories/batch` | Push many memories in one atomic SQLite transaction. |
| `GET` | `/api/memories?since=<iso>` | Pull memories with `received_at > since`. Returns up to 1000 rows, oldest first. |
| `GET` | `/api/memories/search?q=<query>&limit=<n>` | LIKE-based search across `key`, `content`, `tags`. `limit` defaults to 10, max 100. |

### `OrgMemory` shape

```json
{
  "id": "string",
  "key": "string",
  "content": "string",
  "type": "context" | "decision" | "preference" | ...,
  "scope": "global" | "project",
  "tags": "comma,separated,string" | null,
  "version": 1,
  "created_at": "2026-04-10T12:00:00.000Z",
  "updated_at": "2026-04-10T12:00:00.000Z"
}
```

Invalid payloads return `400` with details from zod validation.

### Conflict resolution

Upserts use last-write-wins on `updated_at`. If an incoming memory has an `updated_at` strictly older than the currently stored row, **the write is silently dropped** (the request still returns `200` — clients don't need special handling). This matches the client's own local upsert semantics in `plugins/continuity-org-memory-sync/src/sync-engine.ts`.

### The `since` cursor

`GET /api/memories?since=<iso>` filters on the server-side `received_at` timestamp, **not** the client-side `updated_at`. This is a deliberate correctness choice: `received_at` is monotonic per-server and immune to client clock drift / network delay / batching. The client can just pass its previous `lastSyncAt` and get correct incremental pulls regardless of how many teammates are writing concurrently.

---

## Running the tests

```bash
cd org-server
npm install
npm test           # run once (CI-style)
npm run test:watch # watch mode
```

Tests use [vitest](https://vitest.dev) and [`fastify.inject()`](https://fastify.dev/docs/latest/Guides/Testing/) to hit routes without opening a real port. Each test gets its own `:memory:` SQLite DB — fully isolated, parallel-safe, deterministic.

**Suites:**

- `auth.test.ts` — missing / wrong / malformed / valid bearer tokens
- `health.test.ts` — public liveness endpoint
- `push.test.ts` — single + batch upsert, newer/stale `updated_at`, atomic batch rejection
- `pull.test.ts` — no-cursor full dump, future cursor, monotonic incremental pull, ordering
- `search.test.ts` — match in `key` / `content` / `tags`, `limit`, missing `q`
- `roundtrip.test.ts` — end-to-end plugin-like flow (batch push → pull → search → update → incremental pull)

---

## Using with the `continuity-org-memory-sync` plugin

1. Start this server with a known API key.
2. In the Continuity desktop app: **Settings → Plugins → Org Memory Sync**.
3. Set:
   - `Org Server URL` → e.g. `http://localhost:8787` or your public URL
   - `API Key` → the same value as `CONTINUITY_ORG_API_KEY`
4. Create a `global`-scope memory in Continuity. Within `sync_interval` seconds (default 30), the plugin will push it here.
5. Verify: `curl http://localhost:8787/api/memories -H "Authorization: Bearer $CONTINUITY_ORG_API_KEY"`.

---

## Out of scope (v1)

Deliberately deferred — add these when the underlying need is proven:

- Multi-tenant / multi-org (single API key, single DB today)
- HTTPS termination (use nginx / Caddy / your platform's proxy)
- Rate limiting (can be added as a Fastify plugin)
- Delete propagation (client doesn't send deletes yet)
- FTS5 search (LIKE is fine for team-scale datasets)
- Web UI for browsing memories (future plugin concern)

## License

MIT — same as the rest of Continuity.
