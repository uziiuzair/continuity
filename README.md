# Continuity

**A local-first AI workspace where chat is the write path and structure emerges from conversation.**

<!-- Screenshot placeholder: Add a screenshot of the app here -->
<!-- ![Continuity Screenshot](./docs/screenshot.png) -->

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)]()
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri%202-orange.svg)](https://tauri.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)

---

## What is Continuity?

Productivity tools promise to help you think, but most of them ask you to stop thinking so you can organize instead. You end up managing tasks, building dashboards, and maintaining structure rather than doing the actual work.

**Continuity takes a different approach.**

You just talk. Have a conversation about your project, your research, your plans. The system listens, understands, and quietly builds structure in the background—tasks, notes, timelines, decisions—all extracted from your natural conversation.

Think of it as the space between ChatGPT (pure chat, no memory) and Notion (powerful, but you build everything manually). Continuity gives you the depth of structured thinking without the overhead of manual organization.

### Core Philosophy

- **Chat is the write path** — You don't create tasks or fill out forms. You talk, and structure emerges.
- **Structure earns its place** — No empty templates. Widgets and artifacts appear only when your data warrants them.
- **Dashboards reflect understanding** — Visual summaries of what the system has learned, not canvases for you to build.
- **Local-first** — Your data lives on your machine. Works offline. No accounts required.

---

## Who is this for?

- **Knowledge workers** doing complex, long-running work that unfolds over time
- **Researchers, writers, and builders** who think through conversation
- **Privacy-conscious users** who want to own their data
- **Anyone tired** of manually organizing their thoughts into someone else's structure

---

## Key Features

| Feature                           | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| **Chat-first interface**          | Natural conversation is your primary input method          |
| **Automatic artifact extraction** | Tasks, notes, and decisions emerge from your words         |
| **Spaces**                        | Long-running contexts for projects, domains, or objectives |
| **Auto-generated dashboards**     | Visual orientation without manual building                 |
| **Local-first storage**           | SQLite database on your machine, works offline             |
| **BYOK**                          | Bring Your Own Key for AI providers                        |
| **Cross-platform**                | macOS, Windows, and Linux                                  |

---

## Installation

### Download

> Coming soon: Pre-built binaries for all platforms.

- **macOS**: `.dmg`
- **Windows**: `.exe` / `.msi`
- **Linux**: `.AppImage` / `.deb`

### From Source

**Prerequisites:**

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [npm](https://npmjs.com/) (recommended) or pnpm

**Steps:**

```bash
# Clone the repository
git clone https://github.com/uziiuzair/continuity.git
cd continuity

# Install dependencies
npm install

# Run in development mode
npm tauri dev

# Build for production
npm tauri build
```

---

## Getting Started

1. **Launch the app** — Open Continuity after installation
2. **Start talking** — Describe what you're working on, thinking about, or trying to accomplish
3. **Watch structure emerge** — As you chat, the system extracts tasks, notes, and decisions
4. **Check your dashboard** — See a visual summary of what Continuity understands about your work

No setup wizards. No templates to choose. Just start thinking out loud.

---

## Development

### Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Desktop**: Tauri 2
- **Database**: SQLite (via Tauri SQL plugin)
- **Backend**: Rust

### Project Structure

```
continuity/
├── app/                 # Next.js pages and routes
├── src/
│   ├── components/      # React components
│   └── lib/             # Utilities and database code
├── src-tauri/           # Tauri/Rust backend
│   └── src/             # Rust source code
├── claude_docs/         # Project documentation
└── public/              # Static assets
```

### Running Locally

```bash
# Development mode with hot reload
npm tauri dev

# Type checking
npm typecheck

# Build production app
npm tauri build
```

---

## Contributing

We welcome contributions. Here's how you can help:

1. **Report bugs** — Open an issue with steps to reproduce
2. **Suggest features** — Start a discussion about what you'd like to see
3. **Submit PRs** — Fork, branch, and submit a pull request

Please be kind and constructive. We're building something thoughtful here.

---

## Support the Project

- ⭐ **Star this repo** to help others discover it
- 📣 **Tell someone** who might find it useful
- 🐛 **Report bugs** or suggest improvements
- 🛠️ **Contribute code** to make it better

---

## About

Built by [Ooozzy](https://ooozzy.com) — tiny tools, big curiosity.

We believe in building simple things that do one job well. Continuity is our take on what a thinking tool should be: calm, capable, and respectful of your attention.

**License**: [MIT](LICENSE)

---

_Build calmly. Ship deliberately. Let structure earn its place._
