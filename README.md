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
| MCP               | @mcp-ui/client                                    |

---

## Project Structure

```
continuity/
├── app/                    # Next.js pages (home, journal, projects, documents)
├── components/             # React components
│   ├── canvas/             # Block editor (blocks, chart, columns, database)
│   ├── chat/               # Chat UI, research panel, MCP apps
│   ├── journal/            # Journal editor, calendar, streaks
│   ├── projects/           # Project management
│   ├── documents/          # Document editor
│   ├── layout/             # Sidebar, app shell
│   └── settings/           # Settings panels
├── lib/                    # Utilities and services
│   ├── ai/                 # AI clients, tools, research engine
│   ├── db/                 # Database operations
│   └── mcp/                # MCP client and transports
├── providers/              # 13 React context providers
├── types/                  # TypeScript types
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

## Status

**Status: Alpha**

The core experience works — chat, canvas, journal, projects, documents, and MCP. Expect rough edges and breaking changes.

Future considerations:

- Spaces with auto-generated dashboards
- Graph view for relationship visualization
- Cross-device sync
- Plugin system

---

## Contributing

We welcome contributions. Here's how you can help:

1. **Report bugs** — Open an issue with steps to reproduce
2. **Suggest features** — Start a discussion about what you'd like to see
3. **Submit PRs** — Fork, branch, and submit a pull request

To get set up, follow the [Getting Started](#getting-started) instructions above. Check `claude_docs/` for documentation on the codebase and architecture decisions. Run `npx tsc --noEmit` to verify types before submitting.

Please be kind and constructive. We're building something thoughtful here.

---

## About

Built by [Ooozzy](https://www.ooozzy.com).

**License**: [MIT](LICENSE)

---

_Build calmly. Ship deliberately. Let structure earn its place._
