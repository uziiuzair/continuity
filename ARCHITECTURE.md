# Architecture

How Continuity is built — system design, data flow, and key abstractions.

---

## System Overview

Continuity is a Tauri 2 desktop app with a Next.js frontend, a minimal Rust backend, and two Node.js sidecar processes.

```
┌──────────────────────────────────────────────────────────┐
│                      Tauri Shell                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │            Next.js 16 + React 19 (Webview)         │  │
│  │                                                    │  │
│  │  app/          Pages (home, journal, memories)     │  │
│  │  providers/    14 React contexts in strict order   │  │
│  │  components/   UI organized by domain              │  │
│  │  lib/          Core logic (ai, db, mcp, plugins)   │  │
│  │  types/        TypeScript definitions              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  Rust    │  │  MCP Memory    │  │  Plugin Host    │  │
│  │  Backend │  │  Server        │  │                 │  │
│  │  (sql,   │  │  (Node.js,     │  │  (Node.js,      │  │
│  │   http,  │  │   stdio)       │  │   WebSocket)    │  │
│  │   shell, │  │                │  │        │        │  │
│  │   fs)    │  │  server/       │  │  plugin-host/   │  │
│  └──────────┘  └────────────────┘  └────────┼────────┘  │
│                                             │            │
└─────────────────────────────────────────────┼────────────┘
                                              │ ws://
                                    ┌─────────┴──────────┐
                                    │  Plugin Sidecars   │
                                    │  (standalone repos) │
                                    └────────────────────┘
```

**Rust backend** (`src-tauri/src/lib.rs`) is minimal — just Tauri plugin initialization (sql, http, shell, fs, dialog). No custom commands. All business logic lives in the TypeScript frontend.

**MCP Memory Server** (`server/`) runs as a stdio sidecar spawned by the Tauri shell plugin. Provides 12 memory tools via the Model Context Protocol.

**Plugin Host** (`plugin-host/`) runs as a WebSocket sidecar. Bridges plugins to the app over JSON-RPC 2.0.

---

## Provider Hierarchy

The app wraps the component tree in 14 React context providers in strict order (`app/layout.tsx`). Outer providers are available to inner ones:

```
ViewProvider                    UI view state (which panel is open)
  DeveloperModeProvider         Dev mode toggle
    DatabaseProvider            SQLite init + MCP auto-setup
      OnboardingProvider        First-run onboarding flow
        AuthProvider            API key management
          SubscriptionProvider  Subscription state
            ThreadsProvider     Conversation thread CRUD
              CanvasProvider    Block editor state
                MCPProvider     MCP server connections + tool discovery
                  PluginProvider  Plugin lifecycle, bridges PluginManager to React
                    ChatProvider  AI chat, tool execution, streaming
                      MemoriesProvider  Memory CRUD for the UI
```

**Why order matters**: `ChatProvider` needs MCP tools (from `MCPProvider`), plugin tools (from `PluginProvider`), canvas state (from `CanvasProvider`), and thread context (from `ThreadsProvider`). `PluginProvider` needs the database (from `DatabaseProvider`).

---

## Database Architecture

Two separate SQLite databases, both in `~/Library/Application Support/com.ooozzy.continuity/`:

### App Database (`test.db`)

- **Access**: `@tauri-apps/plugin-sql` (Tauri SQL plugin, IPC from webview to Rust)
- **Connection**: `lib/db.ts` — lazy singleton via `Database.load("sqlite:test.db")`
- **Schema**: `lib/db-service.ts` — ~20 tables initialized on startup

Key tables: `threads`, `messages`, `settings`, `memories`, `artifacts`, `databases`, `database_columns`, `database_rows`, `journal_entries`, `journal_links`, `projects`, `plugins`

### Memory Database (`memory.db`)

- **Access**: `better-sqlite3` (direct file access from Node.js sidecar)
- **Connection**: `server/db/connection.ts`
- **Schema**: `server/db/schema.ts`

Key tables: `memories`, `memory_versions`, `memory_links`, `projects`

### Why two databases?

The MCP memory server is a separate Node.js process communicating via stdio. It cannot use the Tauri SQL plugin (which requires IPC from the webview to Rust). It uses `better-sqlite3` for direct file access. Both databases use WAL mode for concurrent access.

---

## AI Tool System

Tools are collected from multiple sources and passed to the LLM as function definitions. The chat provider (`providers/chat-provider.tsx`) orchestrates tool compilation and execution.

### Tool Sources

| Source | Location | Count | Discovery |
|--------|----------|-------|-----------|
| Canvas tools | `lib/ai/canvas-tools.ts` | 4 | Static |
| Memory tools | `lib/ai/memory-tools.ts` | 3 | Static |
| Artifact tools | `lib/ai/artifact-tools.ts` | 5 | Static |
| Database tools | `lib/ai/database-tools.ts` | 5 | Static |
| Web tools | `lib/ai/web-tools.ts` | 2 | Static |
| Research tools | `lib/ai/research-tools.ts` | 1 | Static |
| Obsidian tools | `lib/ai/obsidian-tools.ts` | 4 | Conditional (vault connected) |
| Work state tools | `lib/ai/work-state-tools.ts` | 2 | Static |
| MCP tools | `lib/ai/mcp-tools.ts` | Dynamic | From connected MCP servers |
| Plugin tools | `lib/ai/plugin-tools.ts` | Dynamic | From connected plugins |

### Tool Execution Flow

```
User sends message
  → ChatProvider.sendMessage()
  → Build system prompt (personality + all tool descriptions)
  → Collect tools: getAllTools() = built-in + MCP + plugin
  → Call AI provider (OpenAI or Anthropic) with streaming
  → AI returns tool calls
  → Dispatch each call to the right executor:
      canvas tool?    → executeCanvasTool()
      memory tool?    → executeMemoryTool()
      web tool?       → executeWebTool()
      MCP tool?       → executeMCPTool()
      plugin tool?    → executePluginTool()
      ...
  → Return results to AI
  → Continue until AI stops calling tools
  → Save final response to DB
```

### Tool Naming

- Built-in: `tool_name` (e.g., `add_to_canvas`, `remember`)
- MCP: `serverId__toolName` (e.g., `continuity__memory_write`)
- Plugin: `plugin__pluginId__toolName` (e.g., `plugin__org-sync__search_org_knowledge`)

---

## Plugin System

### Architecture

Plugins are standalone processes that connect to the Plugin Host over WebSocket:

```
┌─────────────┐    spawns     ┌──────────────┐
│ PluginMgr   │──────────────→│ Plugin Host  │
│ (frontend)  │               │ (Node.js)    │
│             │    stdout     │              │
│             │←──────────────│ WS server on │
│             │  port+token   │ localhost    │
└─────────────┘               └──────┬───────┘
                                     │ ws://
                              ┌──────┴───────┐
                              │   Plugins    │
                              │  (sidecars)  │
                              └──────────────┘
```

1. **PluginManager** (`lib/plugins/manager.ts`) — Frontend singleton. Spawns the Plugin Host and plugin processes via Tauri shell. Parses `__PLUGIN_HOST_MSG__` messages from stdout.

2. **Plugin Host** (`plugin-host/`) — WebSocket server on localhost. Routes JSON-RPC 2.0 messages between plugins and the app. Handlers for: `db.*`, `events.*`, `settings.*`, `chat.*`, `ui.*`, `mcp.*`.

3. **Plugins** — Standalone processes using `@continuity/plugin-sdk`. Connect via WebSocket with auth token. Declare capabilities in `continuity-plugin.json` manifest.

4. **PluginProvider** (`providers/plugin-provider.tsx`) — Bridges PluginManager state to React.

### Host API

| Domain | Methods | Capability |
|--------|---------|------------|
| `db` | query, execute, subscribe | `db:read`, `db:write`, `db:subscribe` |
| `events` | subscribe, unsubscribe | `events:*` |
| `chat` | registerTool, removeTool, injectPrompt, removePrompt | `chat:tools`, `chat:prompts` |
| `ui` | registerPanel, removePanel, showNotification, updateBadge | `ui:*` |
| `mcp` | listServers, getServer, getHostInfo, startServer, stopServer | `mcp:read`, `mcp:control` |
| `settings` | get, set, getAll | (always available) |

### Plugin Tool Execution

```
AI calls plugin__X__toolName
  → isPluginTool() detects prefix
  → executePluginTool() opens WebSocket to Plugin Host
  → Sends JSON-RPC: plugin.callTool { pluginId, toolName, arguments }
  → Plugin Host routes to plugin via its session WebSocket
  → Plugin's SDK dispatches to registered handler
  → Result flows back through the chain to the AI
```

---

## MCP Integration

### MCPManager (`lib/mcp/manager.ts`)

Singleton that manages all MCP server connections:

- Persists config in SQLite `settings` table (key: `mcp_servers`)
- Two transport implementations:
  - **Stdio** (`lib/mcp/stdio-transport.ts`) — spawns child processes via Tauri shell
  - **HTTP** (`lib/mcp/http-transport.ts`) — POST requests to remote servers
- Both implement `MCPTransport` interface (`lib/mcp/transport.ts`)
- Auto-discovers tools, resources, and prompts from each connected server
- Reconnection with exponential backoff (max 5 attempts)

### Built-in Memory Server (`server/`)

- MCP server using `@modelcontextprotocol/sdk`
- 12 tools across 5 modules: memory, project, search, relationship, lifecycle
- Runs as stdio sidecar — Tauri shell spawns it, communicates via newline-delimited JSON
- Database: `server/db/` (schema, connection, CRUD modules)
- Build: `server/build.mjs` bundles to single ESM file via esbuild
- Bundled into Tauri app resources at build time

---

## Key Source Locations

| What | Where |
|------|-------|
| Pages | `app/` (3 routes: home, journal, memories) |
| Providers | `providers/` (14 files) |
| AI tools | `lib/ai/` (10 tool modules + types + providers) |
| Database CRUD | `lib/db/` (11 modules) |
| MCP client | `lib/mcp/` (manager, client, transports) |
| Plugin system | `lib/plugins/` (manager, manifest) |
| Plugin Host | `plugin-host/src/` (server, handlers, db) |
| Plugin SDK | `plugin-sdk/src/` (8 modules) |
| MCP server | `server/` (tools, db, types) |
| Types | `types/` (index, mcp, plugin) |
| Tauri config | `src-tauri/` (lib.rs, tauri.conf.json, capabilities) |

---

## Further Reading

- [CLAUDE.md](CLAUDE.md) — Product philosophy, core patterns, anti-patterns, and quality standards
- [plugin-sdk/README.md](plugin-sdk/README.md) — Plugin SDK reference for plugin developers
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development setup and PR process
