# Active Context

**Last Updated**: 2026-04-03 (MCP Memory Server + Feature Trimming)
**Current Session Focus**: Implemented MCP Memory Server, stripped Documents/Projects, added Memory Dashboard, fixed CORS issue

## Current State Summary

Built the Continuity MCP Memory Server — a standalone Node.js process that any AI tool (Claude Code, Cursor, Windsurf) can write persistent memories to. The server stores memories in `~/.continuity/memory.db` with versioning, relationships, and project-scoped organization. The Tauri desktop app reads the same SQLite file to display a Memory Dashboard. Also stripped the old Documents and Projects features, and fixed a CORS bug in the Anthropic/OpenAI API clients.

---

## Recently Completed (This Session)

### Phase 1: MCP Memory Server

#### New Files (13)
| File | Purpose |
|------|---------|
| `server/package.json` | Server dependencies: @modelcontextprotocol/sdk, better-sqlite3, zod |
| `server/tsconfig.json` | Node.js ESM TypeScript config |
| `server/index.ts` | Entry point — stdio transport, tool registration |
| `server/types.ts` | Server type definitions (Memory, Project, MemoryVersion, MemoryLink) |
| `server/db/connection.ts` | better-sqlite3 connection to ~/.continuity/memory.db with WAL mode |
| `server/db/schema.ts` | DDL for projects, memories, memory_versions, memory_links tables |
| `server/db/memories.ts` | Memory CRUD with version tracking and upsert |
| `server/db/projects.ts` | Project CRUD |
| `server/db/relationships.ts` | Memory link operations |
| `server/db/versions.ts` | Version history queries |
| `server/db/search.ts` | LIKE-based search across key, content, tags |
| `server/tools/memory-tools.ts` | 5 tools: memory_write, memory_read, memory_update, memory_delete, memory_bulk_import |
| `server/tools/project-tools.ts` | 3 tools: project_create, project_list, project_get |
| `server/tools/search-tools.ts` | 1 tool: memory_search |
| `server/tools/relationship-tools.ts` | 2 tools: memory_link, memory_links_get |
| `server/tools/lifecycle-tools.ts` | 1 tool: memory_version_history |

### Phase 3: Feature Trimming

#### Deleted Files (13)
| File | Reason |
|------|--------|
| `app/documents/page.tsx` | Documents feature removed |
| `app/projects/page.tsx` | Projects feature removed |
| `components/documents/*` (5 files) | DocumentsPage, DocumentEditor, DocumentCard, SplitView, DocumentTabs |
| `components/projects/*` (6 files) | ProjectsPage, ProjectDetailView, ProjectCard, etc. |
| `providers/documents-provider.tsx` | Documents state removed |
| `providers/projects-provider.tsx` | Projects state removed |
| `lib/db/projects.ts` | Old projects DB module replaced by MCP server |
| `types/project.ts` | Old project types |

#### Modified Files
| File | Change |
|------|--------|
| `app/layout.tsx` | Removed ProjectsProvider, added MemoriesProvider |
| `providers/chat-provider.tsx` | Removed project imports and project-specific prompt injection |
| `components/layout/Sidebar.tsx` | Replaced Documents+Projects nav with Memories nav |
| `tsconfig.json` | Excluded `server/` directory |

### Phase 4: Memory Dashboard

#### New Files (7)
| File | Purpose |
|------|---------|
| `app/memories/page.tsx` | Route for memory dashboard |
| `providers/memories-provider.tsx` | Reads from ~/.continuity/memory.db via Tauri SQL plugin |
| `components/memories/MemoriesPage.tsx` | Main page: tabs for Global / By Project |
| `components/memories/MemoryList.tsx` | Filterable/searchable list with type chips |
| `components/memories/MemoryCard.tsx` | Card: key, content snippet, type badge, tags, version |
| `components/memories/MemoryDetail.tsx` | Full view: content, versions, linked memories |
| `components/memories/VersionTimeline.tsx` | Version history timeline display |
| `components/memories/ProjectMemories.tsx` | Project-scoped memory grouping |

### Bug Fix: CORS in API Clients

#### Modified Files
| File | Change |
|------|--------|
| `lib/ai/anthropic.ts` | Replaced browser `fetch` with Tauri's `tauriFetch` to bypass CORS |
| `lib/ai/openai.ts` | Same CORS fix |

---

## Architecture Decisions

1. **Separate server process** — MCP server is a standalone Node.js process, not embedded in Tauri. This lets any AI tool connect via stdio independently.
2. **Shared SQLite with WAL** — Server writes, app reads. WAL mode allows concurrent access.
3. **Soft deletes** — Memories are archived, never hard-deleted. Version history is append-only.
4. **Upsert on key+scope+project** — Writing a memory with an existing key auto-versions it.
5. **Tauri HTTP for API calls** — Browser fetch blocked by CORS; Tauri's Rust-side HTTP client bypasses it.

---

## Next Steps

### Phase 2: Test with Claude Code
- Add to `.mcp.json`: `{ "mcpServers": { "ooozzy": { "command": "npx", "args": ["tsx", "server/index.ts"] } } }`
- Test each tool: write → read → update → search → link → version history

### Phase 5: Polish
- FTS5 for better search
- HTTP transport for non-stdio clients
- Auto-refresh via filesystem watcher
- npm publish as `npx ooozzy-memory`

### Verification Checklist
1. ✅ Server starts: `npx tsx server/index.ts` runs without errors
2. ✅ Database created at `~/.continuity/memory.db`
3. ✅ 12 tools registered
4. ✅ TypeScript compilation clean (both app and server)
5. ✅ Documents and Projects removed cleanly
6. ✅ Sidebar updated with Memories nav
7. ⬜ Claude Code sees tools after adding to .mcp.json
8. ⬜ Round-trip: write → read → update → search
9. ⬜ Memory Dashboard shows data in Tauri app
10. ⬜ Chat, Journal, Briefing, Vault all still work

---

## Previous Sessions

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
