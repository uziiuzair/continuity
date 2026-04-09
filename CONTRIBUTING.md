# Contributing to Continuity

Thanks for your interest in contributing. This guide covers development setup, code standards, and the PR process.

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

### Install and Run

```bash
git clone https://github.com/uziiuzair/continuity.git
cd continuity
npm install
npm run tauri dev
```

This starts the Next.js dev server on `localhost:3000` and opens the Tauri window with hot reload.

### Sub-Projects

The repo contains three additional Node.js packages that need their own installs:

```bash
# MCP memory server (if modifying memory tools)
cd server && npm install

# Plugin Host (if modifying the plugin runtime)
cd plugin-host && npm install

# Plugin SDK (if modifying the SDK for plugin authors)
cd plugin-sdk && npm install && npm run build
```

### Configuration

1. Open Settings in the app (gear icon)
2. Add an AI provider key (OpenAI or Anthropic)
3. The MCP memory server auto-connects on first launch

---

## Code Standards

### TypeScript

- **Strict mode** — no `any`, no `@ts-ignore`
- **Components under 200 lines** — split into sub-components if larger
- **No `console.log` in production code** — use it during development, remove before committing
- **Handle all errors** — never swallow silently. Propagate or display to the user
- **Parameterized SQL queries only** — never interpolate user input into SQL strings

### File Organization

| Directory | Contains |
|-----------|----------|
| `app/` | Next.js page routes |
| `components/` | React components grouped by domain (`canvas/`, `chat/`, `plugins/`, etc.) |
| `lib/` | Business logic, no UI (`ai/`, `db/`, `mcp/`, `plugins/`) |
| `providers/` | React context providers |
| `types/` | TypeScript type definitions |
| `server/` | MCP memory server (Node.js sidecar) |
| `plugin-host/` | Plugin Host (Node.js WebSocket sidecar) |
| `plugin-sdk/` | `@continuity/plugin-sdk` npm package |

### Naming Conventions

- **Components**: PascalCase (`PluginFrame.tsx`)
- **Files**: kebab-case for utilities (`db-service.ts`), PascalCase for components
- **Types/interfaces**: PascalCase (`PluginManifest`)
- **Database tables**: snake_case (`memory_versions`)
- **Provider hooks**: `use` prefix (`usePlugins`, `useChat`)

---

## Pull Request Process

### Branch Naming

```
feature/short-description
fix/short-description
docs/short-description
```

### Before Submitting

1. **Type check** — `npx tsc --noEmit` must pass with zero errors
2. **Test in dev mode** — run `npm run tauri dev` and verify your changes work
3. **Keep PRs focused** — one logical change per PR
4. **No unrelated changes** — don't refactor nearby code unless it's part of your change

### Commit Messages

- Use imperative mood: `Add plugin settings panel` not `Added plugin settings panel`
- Keep the first line under 72 characters
- Reference issues if applicable: `Fix memory search crash (#42)`

---

## Product Philosophy

Continuity follows **"chat is the write path"** — structure emerges from conversation, not manual entry. Before proposing a feature, consider:

- Does it preserve context?
- Does it reduce cognitive load?
- Does it improve orientation?

If it doesn't do at least one of these, it likely doesn't belong. See [CLAUDE.md](CLAUDE.md) for the full philosophy.

### Hard Constraints (v1)

- Desktop-only
- No real-time collaboration
- No manual dashboard building
- No forced accounts
- Dashboards remain read-only

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design, provider hierarchy, database architecture, and data flow diagrams.

## Plugin Development

See [plugin-sdk/README.md](plugin-sdk/README.md) for the SDK reference and how to build plugins.

---

## Reporting Issues

- Steps to reproduce
- Expected vs actual behavior
- Platform and OS version
- Console output if relevant
