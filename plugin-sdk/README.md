# @continuity/plugin-sdk

SDK for building Continuity plugins. A plugin is a standalone process that connects to the Continuity desktop app via WebSocket and can extend the AI, access the database, subscribe to events, and inject UI.

## Quick Start

### 1. Create a plugin directory

```bash
mkdir my-plugin && cd my-plugin
npm init -y
npm install @continuity/plugin-sdk
```

### 2. Create the manifest

Every plugin needs a `continuity-plugin.json` at its root:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Does something useful",
  "author": "Your Name",
  "runtime": "node",
  "entry": "index.js",
  "capabilities": ["chat:tools"],
  "settings": []
}
```

### 3. Write the plugin

```typescript
import { ContinuityPlugin } from '@continuity/plugin-sdk'

const plugin = new ContinuityPlugin()

await plugin.chat.registerTool({
  name: 'hello',
  description: 'Says hello',
  parameters: { type: 'object', properties: {}, required: [] },
  handler: async () => ({ content: 'Hello from my plugin!' })
})

await plugin.start()
```

### 4. Install in Continuity

Open Continuity > Settings > Plugins > Install > browse to your plugin directory.

---

## Plugin Manifest

The `continuity-plugin.json` file declares your plugin's metadata, runtime, capabilities, and settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique ID, lowercase alphanumeric with hyphens |
| `name` | string | Yes | Display name |
| `version` | string | Yes | Semver (e.g., `1.0.0`) |
| `description` | string | Yes | Short description |
| `author` | string | Yes | Author name |
| `homepage` | string | No | URL to plugin repo |
| `license` | string | No | License identifier |
| `icon` | string | No | Path to icon file |
| `runtime` | string | Yes | `"node"`, `"python"`, or `"deno"` |
| `entry` | string | Yes | Path to main file (relative to plugin root) |
| `capabilities` | string[] | Yes | What the plugin needs access to |
| `settings` | object[] | No | Auto-generated settings UI |

---

## Capabilities

Declare what your plugin needs in the manifest's `capabilities` array. Users see these at install time.

| Capability | Description |
|------------|-------------|
| `db:read` | Run SELECT queries on the app database |
| `db:write` | Run INSERT/UPDATE/DELETE queries |
| `db:subscribe` | Subscribe to table change events |
| `events:memories` | Receive memory created/updated/deleted events |
| `events:threads` | Receive thread events |
| `events:chat` | Receive chat message events |
| `events:mcp` | Receive MCP server connect/disconnect events |
| `events:app` | Receive app lifecycle events (ready, shutdown) |
| `mcp:read` | List and inspect MCP servers |
| `mcp:control` | Start and stop MCP servers |
| `chat:tools` | Register tools the AI can call |
| `chat:prompts` | Inject system prompt segments |
| `ui:sidebar` | Register a sidebar panel |
| `ui:settings` | Register a settings panel |
| `ui:statusbar` | Register a status bar item |
| `ui:notifications` | Show toast notifications |

---

## API Reference

### `plugin.db`

```typescript
// Run a SELECT query
const rows = await plugin.db.query<{ id: string; content: string }>(
  'SELECT * FROM memories WHERE scope = ?', ['global']
)

// Run an INSERT/UPDATE/DELETE
const affected = await plugin.db.execute(
  'INSERT INTO memories (id, key, content) VALUES (?, ?, ?)',
  [id, key, content]
)

// Subscribe to table changes (events delivered via plugin.events)
await plugin.db.subscribe('memories', ['insert', 'update', 'delete'])
```

### `plugin.events`

```typescript
// Subscribe to events
plugin.events.on('memory:created', async (data) => {
  console.log('New memory:', data.id, data.key)
})

// Unsubscribe
plugin.events.off('memory:created', handler)
await plugin.events.unsubscribe('memory:created')
```

Available events: `memory:created`, `memory:updated`, `memory:deleted`, `thread:created`, `thread:switched`, `chat:message:sent`, `chat:message:received`, `mcp:server:connected`, `mcp:server:disconnected`, `app:ready`, `app:shutdown`

### `plugin.chat`

```typescript
// Register a tool the AI can call
await plugin.chat.registerTool({
  name: 'search_org',
  description: 'Search the org knowledge base',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  },
  handler: async (args) => {
    const results = await search(args.query as string)
    return { content: JSON.stringify(results) }
  }
})

// Remove a tool
await plugin.chat.removeTool('search_org')

// Inject a system prompt segment
await plugin.chat.injectPrompt({
  id: 'org-context',
  content: 'This user has access to a shared org knowledge base.',
  position: 'context'  // "system" or "context"
})

// Remove an injected prompt
await plugin.chat.removePrompt('org-context')
```

The `handler` function runs locally in your plugin process. Only the tool's metadata (name, description, parameters) is sent to the host. When the AI calls your tool, the request is routed to your handler via WebSocket.

### `plugin.ui`

```typescript
// Register a sidebar panel (plugin serves its own UI)
await plugin.ui.registerPanel({
  slot: 'sidebar',
  label: 'My Panel',
  icon: 'puzzle',
  url: 'http://localhost:3456/panel'
})

// Show a toast notification
await plugin.ui.showNotification({
  title: 'Sync Complete',
  message: '42 memories synced to org server',
  type: 'success'  // "info" | "success" | "warning" | "error"
})

// Update badge count on a sidebar item
await plugin.ui.updateBadge('sidebar', 3)
```

For the `url` in `registerPanel`, your plugin typically runs a small HTTP server (e.g., Express) that serves an HTML page. This page is rendered in a sandboxed iframe inside Continuity.

### `plugin.mcp`

```typescript
// List configured MCP servers
const servers = await plugin.mcp.listServers()

// Get the built-in memory server info
const hostInfo = await plugin.mcp.getHostInfo()

// Start/stop an MCP server
await plugin.mcp.startServer('server-id')
await plugin.mcp.stopServer('server-id')
```

### `plugin.settings`

```typescript
// Read a setting
const serverUrl = await plugin.settings.get<string>('server_url')

// Write a setting
await plugin.settings.set('last_sync', new Date().toISOString())

// Get all settings
const all = await plugin.settings.getAll()
```

Settings defined in your manifest's `settings` array automatically generate a configuration UI in Continuity's Settings > Plugins panel.

---

## Settings Definitions

Define settings in your manifest to auto-generate configuration UI:

```json
{
  "settings": [
    {
      "key": "server_url",
      "type": "string",
      "label": "Server URL",
      "placeholder": "https://example.com",
      "required": true
    },
    {
      "key": "api_key",
      "type": "secret",
      "label": "API Key",
      "required": true
    },
    {
      "key": "sync_interval",
      "type": "number",
      "label": "Sync Interval (seconds)",
      "default": 30
    },
    {
      "key": "enabled_features",
      "type": "select",
      "label": "Mode",
      "options": [
        { "label": "Read Only", "value": "read" },
        { "label": "Read & Write", "value": "readwrite" }
      ],
      "default": "read"
    }
  ]
}
```

Supported types: `string`, `number`, `boolean`, `secret` (masked input), `select` (dropdown).

---

## Environment Variables

When Continuity spawns your plugin, it sets these environment variables:

| Variable | Description |
|----------|-------------|
| `CONTINUITY_HOST_URL` | WebSocket URL of the Plugin Host (e.g., `ws://127.0.0.1:54321`) |
| `CONTINUITY_AUTH_TOKEN` | Authentication token for the WebSocket connection |
| `CONTINUITY_PLUGIN_ID` | Your plugin's ID from the manifest |

The SDK reads these automatically — you don't need to pass them manually.

---

## Example

See [`plugins/continuity-org-memory-sync/`](../plugins/continuity-org-memory-sync/) for a full example that:

- Subscribes to memory events and syncs to an org server
- Registers a `search_org_knowledge` AI tool
- Injects a context prompt so the AI knows about org knowledge
- Shows notifications on sync status
