# Active Context

**Last Updated**: 2026-02-18 (MCP Apps Rendering Fix — v6 Protocol)
**Current Session Focus**: Fixed MCP Apps rendering — rewrote sandbox proxy for @mcp-ui/client v6 protocol + promoted apps to message-level visibility

## Current State Summary

Fixed 2 MCP Apps bugs: (1) sandbox proxy timeout caused by protocol mismatch — v6 library expects JSON-RPC `method: "ui/notifications/sandbox-proxy-ready"` but old proxy sent legacy `type: "ui-proxy-iframe-ready"`. Rewrote proxy with full v6 AppFrame support (JSON-RPC relay, `sandbox-resource-ready` handling, message buffering). (2) MCP App widgets buried in collapsed tool calls — moved rendering to message level in ChatMessage.tsx.

---

## Recently Completed (This Session)

### MCP Apps Rendering Fix (v6 Protocol Compatible)

#### Created/Modified Files (4)

| File | Change |
|------|--------|
| `public/mcp-sandbox-proxy.html` | **NEW** — Complete rewrite for @mcp-ui/client v6. Three modes: (1) Legacy rawhtml mode for UIResourceRenderer, (2) Legacy URL mode, (3) **v6 AppFrame mode** (default) — sends JSON-RPC `method: "ui/notifications/sandbox-proxy-ready"`, handles `sandbox-resource-ready` to create inner iframe, relays JSON-RPC bidirectionally with message buffering. |
| `components/chat/MCPAppRenderer.tsx` | Changed `SANDBOX_URL` from `https://proxy.mcpui.dev` to local `/mcp-sandbox-proxy.html`. |
| `components/chat/ChatMessage.tsx` | Added lazy `MCPAppRenderer` import + `extractToolName`. Renders MCP App widgets at message level (after ToolCallsBlock, before prose) — always visible. |
| `components/chat/ToolCallsBlock.tsx` | Removed `MCPAppRenderer` from `ToolCallRow`. Removed lazy import, Suspense. Simplified result display. |

#### Root Cause Analysis
- **Bug 1 (Timeout)**: `@mcp-ui/client` v6.1.0's `loadProxyIframe` checks `d.data.method === "ui/notifications/sandbox-proxy-ready"` (JSON-RPC format). The old proxy at `proxy.mcpui.dev` sends `{ type: "ui-proxy-iframe-ready" }` (legacy format). Protocol mismatch → 10s timeout.
- **Bug 2 (Hidden UI)**: `hasMCPApp` evaluated before async HTML fetch completed → always `false` → tool calls collapsed by default → MCP App invisible.

#### Key Discovery: v6 AppFrame Protocol
1. `AppFrame` ALWAYS uses `loadProxyIframe()` — no srcDoc fallback (that's in HTMLResourceRenderer, a different component)
2. After proxy signals ready, `AppBridge` connects via `PostMessageTransport` (JSON-RPC over postMessage)
3. `sendSandboxResourceReady({html, csp})` sends HTML as JSON-RPC notification — proxy creates inner iframe
4. All subsequent host ↔ guest communication is JSON-RPC relayed through proxy

---

### Documents Page with Tabs & Split View

#### New Files (8)

| File | Purpose |
|------|---------|
| `app/documents/page.tsx` | Route entry point, wraps DocumentsPage in DocumentsProvider |
| `providers/documents-provider.tsx` | Tab state, split view state, document list management |
| `providers/canvas-instance-provider.tsx` | Per-tab canvas state (mirrors CanvasProvider with threadId prop) |
| `components/documents/DocumentsPage.tsx` | Main page: grid view ↔ editor mode with keyboard shortcuts |
| `components/documents/DocumentCard.tsx` | Grid card component with title, preview, relative time |
| `components/documents/DocumentTabs.tsx` | Tab bar with close buttons, split toggle |
| `components/documents/DocumentEditor.tsx` | Editor wrapper with CanvasInstanceProvider + editable title |
| `components/documents/SplitView.tsx` | Horizontal split with draggable divider |

#### Modified Files (5)

| File | Change |
|------|--------|
| `lib/db/threads.ts` | Added `getAllDocuments()` (query threads with canvas content), `createStandaloneDocument()`, `DocumentInfo` type |
| `components/canvas/CustomEditor.tsx` | Added optional `threadId` and `canvasOverride` props, replaced `activeThreadId` with `effectiveThreadId` |
| `components/layout/Sidebar.tsx` | Added "Documents" nav item between Projects and Threads |
| `components/layout/AppShell.tsx` | Hide Canvas panel on `/documents` route |
| `app/globals.css` | Added document page styles (grid, cards, tabs, editor, split view, divider) |

#### Key Architecture Decisions
1. **CanvasInstanceProvider** — Each tab gets its own provider with independent load/save/debounce, separate from the global CanvasProvider
2. **canvasOverride prop** — CustomEditor accepts optional canvas state override, avoiding context shadowing issues
3. **Standalone documents** — Just threads with initialized canvas content, no schema changes
4. **Split view** — Two independent DocumentEditor instances with draggable divider

---

## Verification Checklist

### Documents Page
1. ✅ **Build passes**: `npx next build` with zero errors
2. ⬜ Navigate to `/documents` via sidebar → see grid of all documents
3. ⬜ Click "New Document" → creates doc, opens in fullscreen editor
4. ⬜ Type in editor → content auto-saves (debounced 1s)
5. ⬜ Close tab → return to grid → re-open doc → content persisted
6. ⬜ Open multiple documents → tabs appear, click to switch
7. ⬜ Split view → two editors side-by-side, each saves independently
8. ⬜ Drag split divider → resize panes
9. ⬜ `Cmd+W` closes active tab, `Cmd+Shift+]` switches tabs
10. ⬜ Navigate away from `/documents` → sidebar canvas reappears

---

## Next Steps

### Testing
- Test document creation and editing in Tauri app
- Verify split view with two documents editing simultaneously
- Confirm keyboard shortcuts work correctly
- Test that existing sidebar Canvas still works on other pages

### Future Enhancements
- Document search/filter in grid view
- Document templates
- Recent documents in sidebar

---

## Previous Sessions

### Session: Canvas Columns, Charts & Live Data
- Implemented chart blocks (5 types via Recharts), column layouts (6 options), live data (API polling + DB linking)

### Session: MCP Apps Integration
- Implemented MCP Apps interactive UI rendering in chat via @mcp-ui/client AppRenderer

### Session: Tool Call Display in Chat Messages
- Implemented collapsible tool call display for assistant messages

### Session: MCP Client Support
- Implemented full MCP client support with stdio/HTTP transports

### Session: Multi-Step Deep Research Feature
- Implemented deep research with parallel sub-agents, Perplexity integration

### Session: Custom Editor Replication Guide
- Created comprehensive replication guide (1835 lines) for the custom block editor

### Session: Canvas AI Edit Feature
- Added AI sparkle button and "AI Edit" in slash menu

### Session: Canvas Text Formatting Toolbar
- Implemented floating formatting toolbar with Bold/Italic/Underline/Strikethrough/Code

### Session: Projects Feature
- Implemented project organization with custom AI prompts

### Session: Daily Journal Feature
- Implemented weekly calendar strip, streak tracking, bi-directional links

### Session: Block Type Mismatch Fix & Code Block Support
- Fixed AI-canvas block type mismatch, added code block support
