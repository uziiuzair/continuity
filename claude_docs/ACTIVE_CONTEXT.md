# Active Context

**Last Updated**: 2026-04-08 (Unified Memory System)
**Current Session Focus**: Unified MCP memory with in-app AI memory — one database, system prompt injection

## Current State Summary

Unified the memory system and cleaned up the AI tool pipeline. The in-app AI now uses the same `memory.db` as the MCP server — one source of truth for all tools. Removed the old artifact, database, and work-state tool systems that were still wired into the chat pipeline. The workspace agent prompt now directs the AI to use memory tools + MCP for tracking projects, decisions, and context.

---

## Recently Completed (This Session)

### Unified Memory System

Merged the two disconnected memory systems into one. The in-app AI (remember/recall/forget tools) now reads/writes the same `memory.db` that the MCP server exposes to external tools.

| File | Change |
|------|--------|
| `lib/db/memory-db.ts` | **NEW** — Shared memory.db connection + schema bootstrap |
| `lib/db/memories.ts` | **REWRITE** — All CRUD now hits memory.db with MCP schema (versioned, typed, tagged, soft-delete) |
| `lib/ai/memory-tools.ts` | **ENHANCED** — Added `type`/`tags` params, `getMemoryContext()` for prompt injection, updated system prompt |
| `providers/chat-provider.tsx` | **EDIT** — Wired `getMemoryContext()` into `buildSystemPrompt()` for passive memory awareness |
| `providers/memories-provider.tsx` | **EDIT** — Uses shared `getMemoryDb()` from memory-db.ts |
| `providers/database-provider.tsx` | **EDIT** — Calls `ensureMemorySchema()` at startup |
| `lib/vault/memory.ts` | **FIX** — `.value` → `.content` after type change |
| `lib/db-service.ts` | **EDIT** — Removed old simple `memories` table from test.db |

#### Key Changes
1. **One database**: Both in-app AI and MCP server read/write `memory.db`
2. **System prompt injection**: Memories are pre-loaded into every AI conversation (grouped by type)
3. **Rich schema**: AI tools now support `type` (decision/preference/context/constraint/pattern) and `tags`
4. **Soft delete**: `forget` archives memories instead of hard-deleting
5. **Versioning**: Every memory update bumps version and records history in `memory_versions`
6. **Schema bootstrap**: App creates `memory.db` tables at startup, even before MCP server runs

### Removed Old Tool Systems

Disconnected 3 legacy tool systems from the chat pipeline that were causing the AI to use "List Artifacts", "Read Work State", etc. instead of MCP memory:

| Removed | What it did | Replaced by |
|---------|-------------|-------------|
| `ARTIFACT_TOOLS` (7 tools) | create_task, list_artifacts, etc. | MCP memory (type: decision/context) |
| `WORK_STATE_TOOLS` (7 tools) | read_work_state, add_blocker, etc. | MCP memory (type: constraint/context) |
| `DATABASE_TOOLS` (3 tools) | create_database, add_row, etc. | Not needed in v1 |
| `WORKSPACE_AGENT_PROMPT` (old) | "Call read_work_state on every message" | Rewritten to use memory tools |

Files modified:
- `providers/chat-provider.tsx` — Removed imports, tool arrays, execution branches, system prompts
- `lib/ai/workspace-agent-prompt.ts` — Rewritten for memory-first approach
- `components/chat/ToolCallsBlock.tsx` — Cleaned up old tool labels

The old tool files (`artifact-tools.ts`, `work-state-tools.ts`, `database-tools.ts`) still exist on disk but are no longer imported anywhere

### Plugin System (3 Phases)

#### Phase 1: Plugin Host Infrastructure
| File | Purpose |
|------|---------|
| `types/plugin.ts` | Full type system — manifest, capabilities, RPC protocol |
| `lib/plugins/manifest.ts` | Manifest parser/validator |
| `lib/db/plugins.ts` | CRUD for plugins table |
| `plugin-host/src/index.ts` | Plugin Host entry point (Node.js WebSocket sidecar) |
| `plugin-host/src/server.ts` | WebSocket server with JSON-RPC routing |
| `plugin-host/src/db.ts` | SQLite connection to app DBs |
| `plugin-host/src/handlers/*.ts` | 6 RPC handler modules (db, events, settings, chat, ui, mcp) |
| `lib/plugins/manager.ts` | Frontend PluginManager singleton |
| `providers/plugin-provider.tsx` | React context for plugin state |

#### Phase 2: Chat + UI Integration
| File | Purpose |
|------|---------|
| `lib/ai/plugin-tools.ts` | Bridges plugin tools into AI tool system |
| `components/plugins/PluginFrame.tsx` | Sandboxed iframe for plugin UIs |
| `components/plugins/PluginPanel.tsx` | Full-page plugin view for sidebar |
| `components/settings/panels/PluginsPanel.tsx` | Install/manage plugins UI |

Modified: `chat-provider.tsx`, `view-provider.tsx`, `AppShell.tsx`, `Sidebar.tsx`, `SettingsModal.tsx`, `SettingsSidebar.tsx`

#### Phase 3: SDK + First Plugin
| File | Purpose |
|------|---------|
| `plugin-sdk/src/index.ts` | ContinuityPlugin main class |
| `plugin-sdk/src/client.ts` | WebSocket JSON-RPC client |
| `plugin-sdk/src/*.ts` | API wrappers (db, events, chat, ui, mcp, settings) |
| `plugins/continuity-org-memory-sync/` | First official plugin — org-wide memory sync |

### Design Decisions
1. **WebSocket over stdio/HTTP** — bidirectional, real-time events, natural for persistent connections
2. **JSON-RPC 2.0** — consistent with MCP protocol, familiar in the codebase
3. **Plugin Host as Node.js sidecar** — webview can't run WS server, matches MCP server pattern
4. **API-mediated DB access** — plugins never touch SQLite files directly, all through parameterized queries
5. **Tool handler stays in plugin process** — only metadata sent to host, handler executed locally

---

## Previous Sessions

### Session: Onboarding Flow (Apr 6, 2026)
- Built full onboarding flow — Welcome screen, API key setup, MCP status with memory count

### Session: MCP Memory Server + Feature Trimming (Apr 3, 2026)
- Built MCP Memory Server (12 tools), stripped Documents/Projects, added Memory Dashboard, fixed CORS

### Session: Obsidian Vault Integration (AI-Mediated)
- Implemented vault integration — AI reads/writes to Obsidian vault with user approval

---

## Next Steps

### Immediate
- Test plugin system end-to-end in Tauri dev mode
- Build Plugin Host bundling into Tauri app resources (like MCP server)
- Plugin update mechanism (git pull + restart)
- Plugin dev mode (hot reload, debug logging)

### Future
- Remote plugin registry (browse/install from URL)
- Plugin postMessage bridge for iframe↔host communication
- Build the tunnel plugin as second proof point
- npm publish `@continuity/plugin-sdk`

#### New Files (5)
| File | Purpose |
|------|---------|
| `providers/onboarding-provider.tsx` | Manages onboarding state, step navigation, memory count from MCP DB |
| `components/onboarding/OnboardingFlow.tsx` | Root orchestrator — AnimatePresence between steps |
| `components/onboarding/WelcomeStep.tsx` | Full-screen hero: three pillars (Universal Memory, Fully Local, Always In-Sync) |
| `components/onboarding/ApiKeyStep.tsx` | API key entry with provider/model selection, reuses existing Select atom |
| `components/onboarding/McpStatusStep.tsx` | MCP connection status, memory count highlight, privacy confirmation |

#### Modified Files (3)
| File | Change |
|------|--------|
| `app/layout.tsx` | Added OnboardingProvider after DatabaseProvider |
| `components/layout/AppShell.tsx` | Gates main app behind onboarding completion |
| `components/briefing/OnboardingView.tsx` | Reframed suggestions around KB building, shows memory count, added icons |

### Design Decisions
1. **OnboardingProvider sits after DatabaseProvider** — needs DB access for settings, but before everything else
2. **Memory count checked from separate MCP SQLite** — shows existing memories from other tools during onboarding
3. **Completion stored as `onboarding_completed` setting** — reuses existing settings table, no schema changes
4. **Full-screen overlay in AppShell** — rather than blocking provider tree, so MemoriesProvider still initializes
5. **Step navigation via state, not routes** — keeps onboarding self-contained, no URL changes

---

## Architecture Decisions

1. **Separate server process** — MCP server is a standalone Node.js process, not embedded in Tauri
2. **Shared SQLite with WAL** — Server writes, app reads
3. **Soft deletes** — Memories are archived, never hard-deleted
4. **Upsert on key+scope+project** — Writing a memory with an existing key auto-versions it
5. **Tauri HTTP for API calls** — Browser fetch blocked by CORS; Tauri's Rust-side HTTP client bypasses it

---

## Next Steps

### Immediate
- Test onboarding flow end-to-end in Tauri dev mode
- Consider adding contextual tips (progressive reveal) for first canvas block, first memory, etc.
- Add ability to replay onboarding from settings (reset `onboarding_completed` key)

### Future
- FTS5 for better memory search
- HTTP transport for non-stdio MCP clients
- Auto-refresh via filesystem watcher
- npm publish as `npx ooozzy-memory`

---

## Previous Sessions

### Session: MCP Memory Server + Feature Trimming (Apr 3, 2026)
- Built MCP Memory Server (12 tools), stripped Documents/Projects, added Memory Dashboard, fixed CORS

### Session: Obsidian Vault Integration (AI-Mediated)
- Implemented vault integration — AI reads/writes to Obsidian vault with user approval

### Session: MCP Apps Rendering Fix (v6 Protocol)
- Fixed sandbox proxy timeout and MCP App visibility issues

### Session: Documents Page with Tabs & Split View
- Implemented grid view, tab-based editing, split view, keyboard shortcuts

### Session: Canvas Columns, Charts & Live Data
- Implemented chart blocks, column layouts, live data

### Session: Projects Feature
- Implemented project organization with custom AI prompts

### Session: Daily Journal Feature
- Implemented weekly calendar strip, streak tracking, bi-directional links
