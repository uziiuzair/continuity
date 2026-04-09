# Continuity Plugin Host

Internal infrastructure. The Plugin Host is a Node.js sidecar that bridges plugins to the Continuity desktop app over WebSocket.

**Plugin developers**: Use [`@continuity/plugin-sdk`](../plugin-sdk/README.md) instead of interacting with the host directly.

---

## Architecture

- Node.js process spawned by the Tauri app via the shell plugin
- WebSocket server on `127.0.0.1` (random ephemeral port)
- Authentication via random token generated at startup
- Protocol: JSON-RPC 2.0 over WebSocket
- Database access: opens the app's `test.db` and `memory.db` via `better-sqlite3`

### Communication Channels

| Direction | Channel | Format |
|-----------|---------|--------|
| Host → Frontend | stdout (lines prefixed `__PLUGIN_HOST_MSG__`) | JSON |
| Host → Frontend | stderr | Plain text logs |
| Plugin → Host | WebSocket | JSON-RPC 2.0 |
| Host → Plugin | WebSocket | JSON-RPC 2.0 (responses + event notifications) |

---

## Startup Protocol

1. Frontend spawns: `npx tsx plugin-host/src/index.ts`
2. Host picks a random ephemeral port and generates a 32-byte auth token
3. Host starts WebSocket server on `127.0.0.1:PORT`
4. Host sends startup message to stdout:
   ```
   __PLUGIN_HOST_MSG__{"type":"startup","data":{"port":54321,"token":"abc..."}}
   ```
5. Frontend reads port + token, stores in `PluginManager`
6. Frontend spawns enabled plugin sidecars with env vars:
   - `CONTINUITY_HOST_URL=ws://127.0.0.1:54321`
   - `CONTINUITY_AUTH_TOKEN=abc...`
   - `CONTINUITY_PLUGIN_ID=plugin-id`
7. Plugins connect to the WebSocket with `?token=TOKEN&pluginId=ID` query params

---

## RPC Methods

### Database (`handlers/db.ts`)
- `db.query` — SELECT with parameterized args. Requires `db:read`.
- `db.execute` — INSERT/UPDATE/DELETE. Requires `db:write`. DDL blocked.
- `db.subscribe` — Subscribe to table changes. Requires `db:subscribe`.

### Events (`handlers/events.ts`)
- `events.subscribe` — Start receiving named events.
- `events.unsubscribe` — Stop receiving events.

### Chat (`handlers/chat.ts`)
- `chat.registerTool` — Register an AI tool (metadata only). Requires `chat:tools`.
- `chat.removeTool` — Unregister a tool.
- `chat.injectPrompt` — Add a system/context prompt segment. Requires `chat:prompts`.
- `chat.removePrompt` — Remove a prompt.

### UI (`handlers/ui.ts`)
- `ui.registerPanel` — Register a sidebar/settings/statusbar panel. Requires `ui:*` for the slot.
- `ui.removePanel` — Unregister a panel.
- `ui.showNotification` — Show a toast. Requires `ui:notifications`. Forwarded to frontend via stdout.
- `ui.updateBadge` — Update badge count. Forwarded to frontend via stdout.

### MCP (`handlers/mcp.ts`)
- `mcp.listServers` — List configured MCP servers. Requires `mcp:read`.
- `mcp.getServer` — Get server details. Requires `mcp:read`.
- `mcp.getHostInfo` — Get memory server info. Requires `mcp:read`.
- `mcp.startServer` / `mcp.stopServer` — Control MCP servers. Requires `mcp:control`. Forwarded to frontend.

### Settings (`handlers/settings.ts`)
- `settings.get` / `settings.set` / `settings.getAll` — Plugin-scoped config stored in the `plugins` table.

### Internal
- `plugin.register` — Handshake when a plugin connects. Sets capabilities.
- `plugin.callTool` — Frontend routes AI tool calls to a specific plugin.

---

## Session State

Each connected plugin gets a `PluginSession` tracking:

- `pluginId`, `capabilities`
- `subscribedEvents` — which events to forward
- `subscribedTables` — which DB table changes to forward
- `registeredTools` — tools this plugin provides
- `registeredPanels` — UI panels this plugin provides
- `injectedPrompts` — system prompt segments
- `pendingToolCalls` — in-flight tool executions (request/response matching with 30s timeout)

---

## Development

```bash
npm install
npm run dev      # runs with tsx (TypeScript directly)
npm run build    # bundles with esbuild → dist/plugin-host.mjs
```

The build outputs a single ESM file with `better-sqlite3` as an external dependency (native binary).
