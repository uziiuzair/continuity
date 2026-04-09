# Continuity

**A local-first AI workspace where chat is the write path and structure emerges from conversation.**

<!-- ![Continuity](./docs/screenshot.png) -->

[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![Built with Tauri](https://img.shields.io/badge/Tauri-2-orange.svg)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)

---

## What is Continuity?

Productivity tools promise to help you think, but most of them ask you to stop thinking so you can organize instead. You end up managing tasks, building dashboards, and maintaining structure rather than doing the actual work.

**Continuity takes a different approach.**

You just talk. Have a conversation about your project, your research, your plans. The system listens, understands, and quietly builds structure in the background — tasks, notes, timelines, decisions — all extracted from your natural conversation.

Today, Continuity is a desktop app that combines conversational AI with a custom block editor, daily journal, project workspaces, deep research, and a full MCP client. You bring your own API keys, everything runs locally, and your data never leaves your machine.

### Core Philosophy

- **Chat is the write path** — You don't create tasks or fill out forms. You talk, and structure emerges.
- **Structure earns its place** — No empty templates. Widgets and artifacts appear only when your data warrants them.
- **Dashboards reflect understanding** — Visual summaries of what the system has learned, not canvases for you to build.
- **Local-first** — Your data lives on your machine. Works offline. No accounts required.

---

## Features

### Chat & AI

- Streaming AI chat with OpenAI and Anthropic (bring your own keys)
- 15+ AI tools — canvas editing, web search, memory, artifact creation, and more
- AI canvas editing via sparkle button and slash menu
- Persistent AI memory — remember, recall, and forget across conversations
- Deep research with multi-step reasoning (Perplexity integration)
- Web search (Tavily) and URL reading

### Block Editor (Canvas)

- Custom block editor with paragraph, heading, list, and code blocks
- Inline formatting toolbar (bold, italic, underline, strikethrough, code)
- Chart blocks — 5 chart types via Recharts
- Column layouts — 6 layout options
- Database blocks — spreadsheet-style editing via react-datasheet-grid
- Slash menu and add-block dropdown for quick insertion

### Organization

- Projects with custom AI system prompts
- Daily journal with calendar strip, streaks, and bi-directional links
- Documents with split view and tabs
- Thread management

### MCP (Model Context Protocol)

- Full MCP client supporting stdio and HTTP transports
- MCP Apps rendering — interactive UI directly in chat
- Connector management in settings
- Built-in MCP memory server — 12 tools for persistent, versioned memory
- Also available as a standalone package: `npm i continuity-memory` — use it with any MCP client without installing the full app
- Cross-tool sync — memories from Claude Code, Cursor, or other MCP clients are available in Continuity

### Plugins

- Plugin system with TypeScript SDK (`@continuity/plugin-sdk`)
- Plugins run as standalone sidecar processes (Node.js, Python, or Deno)
- Register AI tools, inject system prompts, subscribe to real-time events
- Access the local database, control MCP servers, inject UI panels
- Plugin settings auto-generated from manifest
- Official example: [Org Memory Sync](plugins/continuity-org-memory-sync/) for team-wide shared knowledge

### Local-First

- SQLite on your machine, works offline
- Bring your own keys for all providers (OpenAI, Anthropic, Tavily, Perplexity)
- Cross-platform — macOS, Windows, Linux
- No accounts required

---

## Tech Stack

| Layer             | Technology                                        |
| ----------------- | ------------------------------------------------- |
| Frontend          | Next.js 16 (App Router), React 19, TypeScript 5.9 |
| Styling           | Tailwind CSS 4, Framer Motion                     |
| Desktop           | Tauri 2 (Rust)                                    |
| Database          | SQLite via @tauri-apps/plugin-sql                 |
| AI                | OpenAI, Anthropic (BYOK)                          |
| Search            | Tavily, Perplexity                                |
| Editor            | Custom block editor                               |
| Charts            | Recharts                                          |
| Data Grid         | react-datasheet-grid                              |
| Markdown          | react-markdown, remark-gfm                        |
| Code Highlighting | prism-react-renderer                              |
| UI Components     | Headless UI, Mantine                              |
| MCP               | @mcp-ui/client, @modelcontextprotocol/sdk          |
| Plugin System     | WebSocket sidecar + @continuity/plugin-sdk          |
| Memory Server     | better-sqlite3, @modelcontextprotocol/sdk           |

---

## Project Structure

```
continuity/
├── app/                    # Next.js pages (home, journal, memories)
├── components/             # React components
│   ├── canvas/             # Block editor (blocks, chart, columns, database)
│   ├── chat/               # Chat UI, research panel, MCP apps
│   ├── journal/            # Journal editor, calendar, streaks
│   ├── memories/           # Memory browser and detail views
│   ├── onboarding/         # First-run onboarding flow
│   ├── plugins/            # Plugin UI (iframe frame, panel)
│   ├── layout/             # Sidebar, app shell
│   └── settings/           # Settings panels (including plugins)
├── lib/                    # Utilities and services
│   ├── ai/                 # AI clients, 10 tool modules, research engine
│   ├── db/                 # Database CRUD modules
│   ├── mcp/                # MCP client and transports
│   └── plugins/            # Plugin manager and manifest validation
├── providers/              # 14 React context providers
├── types/                  # TypeScript types
├── server/                 # MCP memory server (Node.js sidecar)
├── plugin-host/            # Plugin Host (Node.js WebSocket sidecar)
├── plugin-sdk/             # @continuity/plugin-sdk package
├── plugins/                # Official plugin examples
├── src-tauri/              # Tauri/Rust backend
└── public/                 # Static assets
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

### Install from source

```bash
git clone https://github.com/uziiuzair/continuity.git
cd continuity
npm install
npm run tauri dev
```

### Configuration

1. Open **Settings** (gear icon in the sidebar)
2. Add at least one AI provider key — OpenAI or Anthropic
3. Optional: add a Tavily key for web search
4. Optional: add a Perplexity key for deep research

---

## Development

```bash
# Development mode with hot reload
npm run tauri dev

# Type checking
npx tsc --noEmit

# Production build
npm run tauri build
```

---

## Alpha Status

> **This is alpha software.** Continuity is under active development. Expect rough edges, breaking changes, and evolving data formats. We're building in the open because we believe the best tools are shaped by the people who use them.
>
> **Contributions are welcome** — whether you're fixing a typo, adding tests, or building an entire feature. If something feels off, open an issue. If you want to help, check the [areas that need work](#where-we-need-help) below.

---

## Current State

### What's Working

The core experience is functional and usable day-to-day:

- **Chat engine** — Streaming responses with OpenAI and Anthropic, 15+ AI tools, tool calling loop with multi-step reasoning
- **Block editor** — Custom-built with paragraphs, headings, lists, code blocks, chart blocks (5 types via Recharts), column layouts (6 options), and database blocks (spreadsheet-style via react-datasheet-grid)
- **AI canvas editing** — The AI can read, write, update, and delete canvas content via tool calls
- **Daily journal** — Weekly calendar strip, streak tracking, bi-directional links between entries
- **MCP Memory Server** — 12 tools for persistent, versioned, soft-delete memory with cross-tool sync (memories from Claude Code, Cursor, etc. are available in Continuity). Also available standalone via `npm i continuity-memory`
- **Unified memory system** — In-app AI and MCP server share the same `memory.db` — one source of truth
- **MCP client** — Full client supporting stdio and HTTP transports, interactive MCP Apps rendering in chat
- **Plugin system** — WebSocket sidecar architecture with TypeScript SDK, manifest validation, and an example plugin
- **Web search and deep research** — Tavily for search, Perplexity for multi-step reasoning
- **Obsidian vault integration** — AI-mediated read/write with user approval
- **Onboarding flow** — First-run setup for API keys and MCP status

### Where We Need Help

These are real gaps — not busywork. If any of these interest you, jump in.

| Area | Skills | What's Needed |
|------|--------|---------------|
| **Testing** | TypeScript, Jest | No test suite exists yet. Unit tests for `lib/`, integration tests for providers, E2E for critical flows |
| **Spaces** | TypeScript, React | Core product concept — context containers with auto-generated dashboards. Designed but not built ([product spec](claude_docs/PRODUCT_CONTEXT.md)) |
| **AI Artifact Extraction** | TypeScript | The "structure emerges" vision: automatically extract tasks, decisions, notes from conversation. Intent detection, confidence thresholds, Space routing |
| **Graph View** | React, D3/Force Graph | Visualize relationships between memories, threads, and artifacts. Schema supports it, UI doesn't exist yet |
| **Performance** | TypeScript | Message list virtualization for long threads, large canvas optimization, FTS5 for memory search |
| **Plugin System Polish** | TypeScript, Node | Plugin Host bundling into Tauri resources, hot reload dev mode, update mechanism (git pull + restart) |
| **Accessibility** | React, CSS, ARIA | No WCAG audit has been done. Keyboard navigation, screen reader support, focus management |
| **Linux & Windows Testing** | Tauri, Rust | Primarily developed on macOS. Platform-specific bugs, installer testing, path handling |
| **Security Hardening** | Rust, TypeScript | Secure API key storage via Tauri keychain (currently plain SQLite), CSP refinement |
| **Cross-device Sync** | Rust, TypeScript | Optional sync layer so memories and threads are available across machines |
| **Documentation** | Markdown | Plugin SDK API reference, architecture deep-dives, contributor tutorials |

---

## Continuity Memory (Standalone)

Don't need the full desktop app? The MCP memory server is available as a standalone package — use it with Claude Code, Cursor, Windsurf, or any MCP-compatible client.

### Install

```bash
npm i continuity-memory
```

### MCP Configuration

Add this to your MCP client config (e.g., `.mcp.json`, Claude Desktop settings, or Cursor MCP config):

```json
{
  "mcpServers": {
    "continuity": {
      "command": "npx",
      "args": ["continuity-memory"]
    }
  }
}
```

That's it — 12 tools for persistent, versioned, cross-tool memory. Memories are stored locally in SQLite and sync automatically when you use the full Continuity app.

---

## Extending Continuity

Build plugins using the `@continuity/plugin-sdk`:

```typescript
import { ContinuityPlugin } from '@continuity/plugin-sdk'

const plugin = new ContinuityPlugin()

// Register a tool the AI can call
await plugin.chat.registerTool({
  name: 'search_org_knowledge',
  description: 'Search shared org knowledge base',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query']
  },
  handler: async ({ query }) => {
    const results = await searchOrgServer(query as string)
    return { content: JSON.stringify(results) }
  }
})

// Subscribe to real-time events
plugin.events.on('memory:created', async (data) => {
  console.log('New memory:', data)
})

await plugin.start()
```

See [plugin-sdk/README.md](plugin-sdk/README.md) for the full SDK reference and [ARCHITECTURE.md](ARCHITECTURE.md) for system design.

---

## Contributing

Continuity is an alpha product and we genuinely want contributors — not as an afterthought, but because the best version of this tool will be shaped by people who actually use it.

**You don't need to be an expert.** Here's where to start based on your experience:

- **New to the codebase?** — Pick a documentation gap, fix a typo, or improve an error message. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand how things fit together.
- **Comfortable with React/TypeScript?** — Look at the [areas that need help](#where-we-need-help). Testing and accessibility are high-impact and well-scoped.
- **Want to build something big?** — Spaces, artifact extraction, and graph view are open design problems. Start a discussion before diving in so we can align on approach.

### Quick Start

```bash
git clone https://github.com/uziiuzair/continuity.git
cd continuity
npm install
npm run tauri dev
```

Before submitting a PR, run `npx tsc --noEmit` to catch type errors. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide — code standards, branch naming, and PR process.

### Ways to Contribute

- **Report bugs** — Open an issue with steps to reproduce and your platform/OS
- **Suggest features** — Start a discussion. Bonus points if you've read the [product philosophy](CLAUDE.md#core-product-philosophy---internalize-this)
- **Write tests** — This is the single highest-impact contribution right now
- **Submit PRs** — Fork, branch, and submit. Keep PRs focused on one logical change

Be kind and constructive. We're building something thoughtful here.

---

## About

Built by [Ooozzy](https://www.ooozzy.com).

**License**: [MIT](LICENSE)

---

_Build calmly. Ship deliberately. Let structure earn its place._
