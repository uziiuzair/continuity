# Progress Log

**Purpose**: Track implementation progress, decisions, and historical context for Ooozzy

## Current State (Latest Update: 2026-02-02)

### Recently Implemented
- **Custom Block Editor (Phase 1)** - Replaced BlockNote with custom implementation
- **Database Block with react-datasheet-grid** - Excel-like spreadsheet editing
- **AI Canvas Tool Calling** - AI can read, write, update, delete canvas content
- **Canvas Persistence** - Per-thread canvas stored in SQLite
- Project scaffolding (Next.js 16 + Tauri 2 + React 19)
- SQLite database with threads/messages/canvas schema
- Full chat interface with streaming AI responses
- OpenAI and Anthropic client integration with tool calling
- Markdown rendering for AI messages (react-markdown + remark-gfm)
- Thread management (create, switch, list, delete)
- Settings panel for API key configuration
- Provider architecture (Database → Threads → Canvas → Chat → View)

### In Progress
- None currently

### Blocked / Waiting
- None currently

### Next Up
- Spaces implementation
- Custom blocks (Charts, embeds)
- AI artifact extraction
- Dashboard widgets

---

## Implementation History

### Week of Feb 2, 2026

#### Custom Block Editor (Phase 1)

**Date**: 2026-02-02
**Type**: Feature/Refactor
**Status**: Complete

**Problem/Requirement**:
BlockNote had issues with custom blocks - programmatic updates didn't trigger onChange, styling conflicts were hard to override, and the library was heavy for features we didn't fully use. Wanted full control over persistence and styling.

**Solution**:
Built custom block-based editor from scratch with paragraph-only support (Phase 1). Full control over state flow, persistence, and styling. BlockNote kept for reference but no longer used.

**Implementation Details**:
1. **Block Types** (`components/canvas/blocks/types.ts`):
   - `EditorBlock`: Generic block structure with id, type, content, props, children
   - `InlineContent`: Text/link content with optional styles
   - Helper functions: generateBlockId, textToContent, createEmptyParagraph

2. **Block Dispatcher** (`components/canvas/Block.tsx`):
   - Routes block.type to appropriate component
   - Uses forwardRef for focus management
   - Fallback UI for unknown block types

3. **ParagraphBlock** (`components/canvas/blocks/ParagraphBlock.tsx`):
   - contentEditable div with placeholder
   - Enter creates new paragraph after
   - Backspace on empty deletes (or clears if only block)
   - Arrow up/down navigation between blocks
   - IME composition handling

4. **CustomEditor** (`components/canvas/CustomEditor.tsx`):
   - Manages blocks state
   - Syncs with canvas provider (with duplicate prevention)
   - Focus management via refs Map
   - Thread change handling

5. **Canvas Provider Updates** (`providers/canvas-provider.tsx`):
   - Made editor-agnostic (removed BlockNote types)
   - Generic `EditorAPI` interface for future AI integration
   - Renamed registerEditor → registerEditorApi

**Files Created**:
- `components/canvas/Block.tsx`
- `components/canvas/blocks/types.ts`
- `components/canvas/blocks/ParagraphBlock.tsx`
- `components/canvas/blocks/index.ts`
- `components/canvas/CustomEditor.tsx`

**Files Modified**:
- `providers/canvas-provider.tsx` - Editor-agnostic API
- `components/canvas/index.tsx` - Switched to CustomEditor
- `components/canvas/editor.tsx` - Disabled provider registration (kept for reference)
- `app/globals.css` - Custom editor styles

**Key Decisions**:
- **Keep BlockNote for reference**: Don't delete until custom editor is stable
- **Paragraph-first**: Start minimal, add block types incrementally
- **contentEditable**: Native browser editing, simple and fast
- **State in editor**: Blocks state in CustomEditor, synced to provider
- **Focus via refs**: Map of block IDs to refs for focus management

**Data Flow**:
```
User types → ParagraphBlock.handleInput → onUpdate(blockId)
→ CustomEditor.handleUpdate → setBlocks → useEffect → updateContent
→ CanvasProvider.updateContent → debounced saveToDb
```

---

#### Database Block Migration to react-datasheet-grid

**Date**: 2026-02-02
**Type**: Feature/Refactor
**Status**: Complete

**Problem/Requirement**:
Custom database block implementation had separate Table, List, and Kanban views with custom cell components. Needed a more robust spreadsheet experience with better keyboard navigation, copy/paste, and built-in virtualization.

**Solution**:
Replaced custom implementation with `react-datasheet-grid` (DSG) for Excel-like editing. Dropped List and Kanban views - now table-only with better UX.

**Implementation Details**:
1. **DSG Adapter** (`lib/canvas/database/dsg-adapter.ts`):
   - `toDSGData`: Convert DatabaseBlockData rows to DSG format
   - `fromDSGData`: Convert DSG rows back to DatabaseBlockData
   - `buildDSGColumns`: Build DSG column config from DatabaseColumnDef

2. **Custom Select Column** (`lib/canvas/database/dsg-columns/select-column.tsx`):
   - Dropdown with colored option badges
   - Create new options on paste
   - Reuses existing color system

3. **DatabaseTable Component**:
   - Uses DataSheetGrid with custom columns
   - Handles DSG operations (CREATE, UPDATE, DELETE)
   - Integrates with DatabaseContext

4. **Type/Context Updates**:
   - Removed `viewType` and `kanbanConfig` from types
   - Removed `setViewType` and `setKanbanGroupBy` from context
   - Updated AI tools to remove viewType parameter

**Files Created**:
- `lib/canvas/database/dsg-adapter.ts`
- `lib/canvas/database/dsg-columns/select-column.tsx`
- `components/canvas/database/DatabaseTable.tsx`

**Files Deleted**:
- `components/canvas/database/views/` (TableView, ListView, KanbanView)
- `components/canvas/database/cells/` (TextCell, NumberCell, etc.)
- `components/canvas/database/ColumnHeader.tsx`

**Files Modified**:
- `lib/canvas/database/types.ts` - Removed DatabaseViewType
- `lib/canvas/database/defaults.ts` - Removed viewType from factories
- `components/canvas/database/DatabaseContext.tsx` - Removed view methods
- `components/canvas/database/DatabaseBlock.tsx` - Simplified
- `components/canvas/database/DatabaseToolbar.tsx` - Removed view switcher
- `components/canvas/database/index.ts` - Updated exports
- `lib/ai/database-tools.ts` - Removed viewType from tools
- `app/globals.css` - Added DSG select cell styles
- `package.json` - Added react-datasheet-grid

**Key Decisions**:
- **Drop List/Kanban for now**: DSG handles table view excellently; List/Kanban can be added later if needed
- **Table-only approach**: Simplifies codebase significantly
- **Custom select column**: DSG doesn't have a select column with colors, so built one
- **Preserve row IDs**: Use `__rowId` property to maintain identity through DSG operations

---

### Week of Feb 1, 2026

#### AI Tool Expansion (Web, Memory, Artifacts)

**Date**: 2026-02-01
**Type**: Feature
**Status**: Complete

**Problem/Requirement**:
AI only had canvas tools (4). Needed broader capabilities: web search, URL reading, temporal awareness, persistent memory, and task/artifact management.

**Solution**:
Expanded from 4 to 15 tools across 5 categories: Canvas, Web, Memory, Artifacts.

**Implementation Details**:

1. **Web Tools** (`lib/ai/web-tools.ts`):
   - `web_search`: Tavily API integration for internet search
   - `read_url`: Fetch pages using Tauri HTTP plugin + DOMParser
   - `get_current_time`: Timezone-aware time/date

2. **Memory Tools** (`lib/ai/memory-tools.ts`):
   - `remember`: Store key-value pairs
   - `recall`: Retrieve memories
   - `forget`: Delete memories

3. **Artifact Tools** (`lib/ai/artifact-tools.ts`):
   - `create_task`, `complete_task`, `list_tasks`
   - `create_note`, `create_decision`
   - `list_artifacts`, `delete_artifact`

4. **Database**:
   - Added `memories` table (key-value with scope)
   - Added `artifacts` table (tasks, notes, decisions)

5. **Tauri HTTP Plugin**:
   - Added `tauri-plugin-http` to bypass CORS for web requests
   - Configured in Cargo.toml, lib.rs, and capabilities

**Files Created**:
- `lib/ai/web-tools.ts`
- `lib/ai/memory-tools.ts`
- `lib/ai/artifact-tools.ts`
- `lib/db/memories.ts`
- `lib/db/artifacts.ts`

**Files Modified**:
- `lib/db-service.ts` - Added memories & artifacts tables
- `providers/chat-provider.tsx` - Tool routing for all 15 tools
- `components/settings/panels/ApiKeysPanel.tsx` - Tavily API key input
- `types/index.ts` - Memory, Artifact types
- `src-tauri/Cargo.toml` - tauri-plugin-http
- `src-tauri/src/lib.rs` - HTTP plugin registration
- `src-tauri/capabilities/default.json` - http:default permission

**Key Decisions**:
- **Tauri HTTP for CORS bypass**: Browser fetch blocked by CORS
- **Memory as key-value**: Simple, flexible, scope-aware
- **Artifacts per-thread**: Tasks/notes/decisions tied to conversation
- **Combined system prompt**: All tool descriptions in one block

---

#### AI Canvas Tool Calling

**Date**: 2026-02-01
**Type**: Feature
**Status**: Complete

**Problem/Requirement**:
AI could create content in the canvas but couldn't read or modify existing content. Users wanted to say "mark the first 3 tasks as complete" and have the AI update the canvas accordingly.

**Solution**:
Implemented full tool calling support for both OpenAI and Anthropic. AI now has 4 tools to interact with the canvas: `read_canvas`, `add_to_canvas`, `update_block`, `delete_block`.

**Implementation Details**:
- Added AITool, AIToolCall, ChatOptions types to `lib/ai/types.ts`
- Updated OpenAI client with tool calling support (streaming)
- Updated Anthropic client with tool calling support (streaming)
- Created `lib/ai/canvas-tools.ts` with tool definitions and execution
- Chat provider now has tool calling loop (max 10 iterations)
- Tools execute against database directly, then refresh UI

**Files Created**:
- `lib/canvas/types.ts` - Canvas block types
- `lib/canvas/ai-canvas-api.ts` - AI Canvas API interface
- `lib/canvas/blocknote-adapter.ts` - BlockNote implementation
- `lib/canvas/index.ts` - Module exports
- `lib/ai/canvas-tools.ts` - Tool definitions and execution

**Files Modified**:
- `lib/ai/types.ts` - Tool calling types
- `lib/ai/openai.ts` - Tool calling with streaming
- `lib/ai/anthropic.ts` - Tool calling with streaming
- `lib/ai/index.ts` - Export new types
- `lib/db/canvas.ts` - appendCanvasBlocks function
- `providers/canvas-provider.tsx` - aiApi, registerEditor, refreshContent
- `providers/chat-provider.tsx` - Tool calling loop
- `components/canvas/editor.tsx` - Register editor, cursor fix

**Key Decisions**:
- **Tool calling over code fences**: More reliable than parsing special markdown
- **Database-first**: Tools write to SQLite directly, then refresh UI
- **Tool calls in assistant message**: OpenAI requires tool_calls array in conversation
- **Max 10 iterations**: Safety limit for tool calling loop
- **Cursor preservation**: Track user edits to avoid cursor jumping

**Tool Definitions**:
```typescript
CANVAS_TOOLS = [
  { name: "read_canvas", description: "Read current canvas content..." },
  { name: "add_to_canvas", params: { blocks: [...] } },
  { name: "update_block", params: { blockId, content?, props? } },
  { name: "delete_block", params: { blockId } }
]
```

---

#### Canvas Persistence

**Date**: 2026-02-01
**Type**: Feature
**Status**: Complete

**Problem/Requirement**:
Canvas content was lost on page refresh or thread switch. Needed per-thread canvas storage.

**Solution**:
Added `canvas_content` column to threads table. Canvas content stored as JSON. Auto-save with 1s debounce.

**Implementation Details**:
- Schema migration adds `canvas_content TEXT` to threads
- `lib/db/canvas.ts` with getCanvasContent, saveCanvasContent, appendCanvasBlocks
- `CanvasProvider` manages state with auto-save
- Editor loads content on thread switch

**Files Created**:
- `lib/db/canvas.ts` - Canvas CRUD operations
- `providers/canvas-provider.tsx` - Canvas state management

**Files Modified**:
- `types/index.ts` - CanvasContent type
- `lib/db-service.ts` - Schema migration
- `app/layout.tsx` - CanvasProvider in hierarchy
- `components/canvas/editor.tsx` - Connected to provider

**Key Decisions**:
- **1:1 relationship**: Canvas as column in threads (not separate table)
- **JSON storage**: BlockNote format stored directly
- **1s debounce**: Prevents excessive writes during typing
- **Save before switch**: Pending changes saved when switching threads

---

#### Streaming AI Responses + Markdown Rendering

**Date**: 2026-02-01
**Type**: Feature
**Status**: Complete

**Problem/Requirement**:
AI responses appeared all at once after completion. Users should see text appear progressively as the AI generates it. AI responses also needed markdown formatting support.

**Solution**:
Implemented streaming for both OpenAI and Anthropic clients with callback-based chunk delivery. Added react-markdown for rendering assistant messages.

**Implementation Details**:
- Added `chatStream` method to `AIClient` interface
- OpenAI: Parse SSE format (`data: {"choices":[{"delta":{"content":"..."}}]}`)
- Anthropic: Parse event format (`content_block_delta` events)
- Chat provider creates empty assistant message, updates incrementally
- Only saves to DB after stream completes
- Assistant messages render with ReactMarkdown + remark-gfm

**Files Modified**:
- `lib/ai/types.ts` - Added `chatStream` to interface
- `lib/ai/openai.ts` - SSE streaming implementation
- `lib/ai/anthropic.ts` - Event streaming implementation
- `providers/chat-provider.tsx` - Incremental message updates
- `components/chat/ChatMessage.tsx` - Markdown rendering
- `package.json` - Added react-markdown, remark-gfm

**Key Decisions**:
- **Callback-based**: `onChunk(text)` simpler than async iterators
- **Optimistic UI**: Create empty message before streaming starts
- **DB on complete**: Only persist final content, not incremental
- **User plain text**: Only assistant messages get markdown

---

#### Chat Interface + AI Integration

**Date**: 2026-02-01
**Type**: Feature
**Status**: Complete

**Problem/Requirement**:
Need working chat interface that connects to AI providers (OpenAI, Anthropic) with BYOK (bring your own key) setup.

**Solution**:
Built full chat interface with provider architecture, AI client abstraction, and settings panel for API keys.

**Implementation Details**:
- Created `ChatProvider` for message state management
- Created `ThreadsProvider` for thread management
- Built AI client factory with OpenAI/Anthropic implementations
- Settings stored in SQLite with encryption consideration
- Messages persist to database with thread association

**Files Created**:
- `lib/ai/types.ts` - AIClient interface
- `lib/ai/openai.ts` - OpenAI client
- `lib/ai/anthropic.ts` - Anthropic client
- `lib/ai/index.ts` - Client factory
- `providers/chat-provider.tsx`
- `providers/threads-provider.tsx`
- `lib/db/messages.ts`
- `lib/db/threads.ts`
- `lib/db/settings.ts`
- `components/chat/*`
- `components/settings/*`

---

### Week of Feb 1, 2025

#### Project Initialization

**Date**: 2025-02-01
**Type**: Infrastructure
**Status**: Complete

**Problem/Requirement**:
Create foundation for Ooozzy Local-First AI Workspace.

**Solution**:
Next.js 16 + Tauri 2 project with SQLite database.

**Implementation Details**:
- Initialized Next.js 16 with App Router
- Added Tauri 2 with SQL plugin
- Configured SQLite database
- Set up basic project structure

**Files Created**:
- `app/page.tsx` - Hello World homepage
- `app/layout.tsx` - Root layout
- `src/lib/db.ts` - Database connection
- `src-tauri/src/lib.rs` - Tauri plugin setup
- `src-tauri/tauri.conf.json` - App configuration

**Key Decisions**:
- **Next.js 16**: Latest features, React 19 support
- **Tauri 2**: Smaller bundle, better performance than Electron
- **SQLite**: Local-first, no server required
- **TypeScript**: Type safety throughout

---

#### Memory Bank + Product Spec Integration

**Date**: 2025-02-01
**Type**: Documentation
**Status**: Complete

**Problem/Requirement**:
Need Claude to understand the full Ooozzy product vision and maintain context across sessions.

**Solution**:
Comprehensive memory bank system with product specification integrated into all documentation.

**Implementation Details**:
- Created 7-file documentation structure
- Integrated full product philosophy
- Designed complete database schema
- Documented AI integration patterns
- Established code conventions

**Files Created**:
- `CLAUDE.md` - Product-aware behavior instructions
- `claude_docs/ACTIVE_CONTEXT.md` - Current work tracking
- `claude_docs/PROJECT_BRIEF.md` - Product overview
- `claude_docs/TECH_CONTEXT.md` - Architecture + schema
- `claude_docs/SYSTEM_PATTERNS.md` - Code conventions
- `claude_docs/PRODUCT_CONTEXT.md` - Features + artifacts
- `claude_docs/PROGRESS.md` - This file

**Key Decisions**:
- **No SCHEMA.json**: Schema documented in TECH_CONTEXT.md instead
- **Soft deletes**: All artifacts use `archived_at` instead of hard delete
- **Source tracking**: All artifacts link to `source_message_id`
- **JSON for flexibility**: Some fields use JSON for metadata

**Product Philosophy Documented**:
1. Chat is the write path
2. Structure emerges, not designed
3. Dashboards reflect understanding (read-only v1)
4. Spaces = long-running context
5. Local-first by default

**Database Schema Designed**:
- `spaces` - Context containers
- `messages` - Conversation history
- `tasks` - Extracted tasks
- `notes` - Extracted notes
- `decisions` - Extracted decisions
- `milestones` - Key dates/targets
- `constraints` - Limitations
- `data_tables` - Structured data
- `settings` - User preferences

---

## Architectural Decisions

### ADR-001: Desktop Framework Choice

**Date**: 2025-02-01
**Status**: Accepted

**Context**:
Need cross-platform desktop framework for local-first AI workspace.

**Options Considered**:
1. **Electron**: Mature, large ecosystem, but ~150MB bundle, high memory
2. **Tauri**: ~10MB bundle, native performance, Rust backend

**Decision**: Tauri 2

**Rationale**:
- Performance aligns with "local-first" philosophy
- Smaller bundle = faster updates, better UX
- Rust enables future optimizations
- Tauri 2 is stable with good docs

**Consequences**:
- Need Rust knowledge for advanced features
- Smaller ecosystem for troubleshooting
- Some Node.js packages won't work

---

### ADR-002: Frontend Framework Choice

**Date**: 2025-02-01
**Status**: Accepted

**Context**:
Need modern React framework for Tauri frontend.

**Options Considered**:
1. **Vite + React**: Fast, simple, minimal config
2. **Next.js**: Excellent DX, App Router, TypeScript

**Decision**: Next.js 16

**Rationale**:
- App Router for file-based routing
- Strong TypeScript integration
- Static export works with Tauri

**Consequences**:
- Some Next.js features (SSR, API routes) not applicable
- Need static export configuration

---

### ADR-003: Database Choice

**Date**: 2025-02-01
**Status**: Accepted

**Context**:
Need local database for persistent storage.

**Options Considered**:
1. **LocalStorage/IndexedDB**: Built-in, but limited queries
2. **SQLite**: Full SQL, proven, portable
3. **PostgreSQL/MySQL**: Overkill for desktop app

**Decision**: SQLite via Tauri SQL plugin

**Rationale**:
- Full SQL querying capability
- Single file storage (easy backup)
- Perfect for local-first architecture
- Well-supported by Tauri

**Consequences**:
- Limited concurrent writes (fine for single-user)
- Manual schema migrations
- No real-time features without polling

---

### ADR-004: Chat-First Architecture

**Date**: 2025-02-01
**Status**: Accepted

**Context**:
Traditional productivity tools require manual structure creation. Want to reduce cognitive load.

**Decision**: Chat is the only write path in v1

**Rationale**:
- Reduces friction (no forms, no builders)
- AI handles structure extraction
- Users focus on thinking, not organizing
- Structure emerges naturally from conversation

**Consequences**:
- Heavy reliance on AI accuracy
- May frustrate users wanting direct control
- Need excellent AI extraction logic
- Clear positioning required (this is NOT a traditional tool)

---

### ADR-005: Read-Only Dashboards (v1)

**Date**: 2025-02-01
**Status**: Accepted

**Context**:
Dashboards could be builders (like Notion) or projections (like analytics).

**Decision**: Dashboards are read-only projections in v1

**Rationale**:
- Aligns with "structure emerges" philosophy
- Reduces complexity significantly
- Forces chat-first behavior
- Can add editing later if needed

**Consequences**:
- Users cannot directly edit artifacts
- Must use chat to modify structure
- Dashboard is purely for orientation
- Limited customization options

---

### ADR-006: Artifact Traceability

**Date**: 2025-02-01
**Status**: Accepted

**Context**:
Users may wonder "why does this task exist?" Need to preserve context.

**Decision**: All artifacts link to source_message_id

**Rationale**:
- User can always trace origin
- Supports "event-like" data model
- Enables future features (undo, audit trail)
- Builds trust in AI extraction

**Consequences**:
- Extra foreign key on all artifact tables
- Need UI to show source message
- Storage overhead (minimal)

---

## Technical Debt Log

### None Currently

Fresh project with no accumulated debt.

### Anticipated Debt

1. **Migration System**: Will need proper migration handling as schema evolves
2. **Backup/Restore**: Users will want data backup
3. **Performance Monitoring**: Will need telemetry as usage grows

---

## Migration Log

### None Currently

No migrations yet - initial schema to be implemented.

---

## Timeline Summary

### 2026

**February - Week 1**:
- ✅ AI Canvas Tool Calling (read, add, update, delete)
- ✅ Canvas persistence (per-thread, auto-save)
- ✅ Streaming AI responses
- ✅ Markdown rendering for chat
- ✅ Full chat interface working
- ✅ OpenAI + Anthropic integration with tool calling
- ✅ AI Tool Expansion (15 tools total):
  - ✅ Web Tools (web_search, read_url, get_current_time)
  - ✅ Memory Tools (remember, recall, forget)
  - ✅ Artifact Tools (tasks, notes, decisions)
- ✅ Tauri HTTP plugin for CORS-free requests

**February - Week 2**:
- ✅ Custom Block Editor Phase 1 (replaced BlockNote with custom implementation)
- ✅ Database Block with react-datasheet-grid (Excel-like editing)
- ✅ Dropped List/Kanban views (table-only for now)
- ✅ Custom select column with colored badges

**February - Upcoming**:
- Custom Block Editor Phase 2 (heading, lists, slash menu)
- Custom Block Editor Phase 3 (database block migration)
- Artifact UI (task list panel, notes view)
- Spaces implementation
- Dashboard widgets

**Q1 Goals**:
- ✅ Working chat interface
- ✅ AI-collaborative canvas
- Spaces and artifact extraction
- Basic dashboard
- Beta release

### 2025

**February - Week 1**:
- Project initialization
- Memory bank setup
- Product spec integration
- Database schema (threads, messages)
- Chat UI foundation
