# Project Brief

## Project Overview

**Project Name**: Ooozzy Local-First AI Workspace
**Code Name**: Continuity
**Organization**: Ooozzy
**Project Type**: Desktop Application (Open Source)
**License**: MIT (core) + Proprietary services
**Status**: Initial Development
**Start Date**: February 2025

## Executive Summary

Ooozzy is a desktop-first, local-only thinking and productivity system where:

- **Chat is the primary interface** for thinking and action
- **Structure emerges after conversation**, not before
- **Data lives on the user's machine** by default
- **Dashboards are generated representations** of understanding, not manual constructions

The product sits intentionally between ChatGPT and Notion:
- More structured and visual than chat
- Less manual, less performative, and less schema-obsessed than traditional productivity tools

## Product Position

```
ChatGPT ──────────────────── Ooozzy ──────────────────── Notion
(Pure Chat)                 (Structured Thinking)        (Manual Building)

Unstructured                Structure Emerges            User Builds Structure
No Persistence              Local-First                  Cloud-First
General Assistant           Thinking Partner             Productivity Tool
```

## Core Principles

### 1. Local-First by Default
- All user data stored locally (SQLite)
- Fully usable offline
- User owns their data, files, and history
- Cloud services are optional conveniences, never requirements

### 2. Chat Is the Write Path
- Users do NOT create tasks, tables, dashboards manually in v1
- All mutations originate from natural language
- AI interprets intent and updates the data model
- Dashboard is a read model, not a builder

### 3. Structure Emerges, Not Designed
- No templates, no upfront choices
- Widgets/tables/timelines appear only when warranted
- Empty canvases are avoided
- System earns structure through usage

### 4. Dashboards Reflect Understanding
- Visual summaries of what the system understands
- Opinionated, auto-laid-out, initially read-only
- Layout manipulation intentionally removed in v1
- Goal is orientation, not customization

### 5. One Space = One Ongoing Context
- Spaces represent long-running objectives/projects/domains
- Can be auto-created by AI from conversation
- Manual creation/rename is secondary
- Examples: "Financial Planning", "Product Launch", "Research Topic"

## Business Objectives

### Primary Goals
1. **Prove Core Experience**: Validate that chat-first structure emergence works
2. **Build Trust**: Users own their data, no lock-in
3. **Ship Deliberately**: Focus on depth over breadth

### Success Criteria
- Users can think through complex projects via chat
- Structure emerges naturally without manual setup
- Dashboards provide useful orientation
- Works fully offline

## Target Audience

**Primary Users**: Knowledge workers who do deep, ongoing thinking work

**User Characteristics**:
- Work on complex projects over time (weeks/months)
- Currently use multiple tools (chat + notes + tasks)
- Frustrated by manual organization overhead
- Value privacy and data ownership

**Example Use Cases**:
- Financial planning and tracking
- Product launches
- Research topics
- Client work
- Personal projects

## Scope

### In Scope (v1)

**Phase 1 - Foundation**
- Chat engine (primary interface)
- Space creation/management
- Basic artifact extraction (tasks, notes)
- Simple dashboard rendering

**Phase 2 - Core Experience**
- AI intent interpretation
- Topic boundary detection
- Auto-artifact creation
- Widget rendering (task list, timeline, notes)

**Phase 3 - Polish**
- Dashboard auto-layout
- Space switching
- Conversation history
- Basic search

### Out of Scope (v1)

**Hard Constraints**:
- No real-time collaboration
- No mobile app
- No manual dashboard building
- No forced accounts
- No cloud sync (optional for later)

**Explicit Non-Goals**:
- General chat assistant
- Personal wiki
- Drag-and-drop productivity builder
- Web version

### Future Considerations
- Editable dashboards (post-v1)
- Sync across devices
- Team Spaces
- Plugin system
- Graph view
- Deeper analytics

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ooozzy Desktop App                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  Chat Interface                      │   │
│   │              (Primary Write Path)                    │   │
│   └──────────────────────┬──────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                   AI Engine                          │   │
│   │    • Intent interpretation                          │   │
│   │    • Topic boundary detection                       │   │
│   │    • Artifact extraction                            │   │
│   │    • Space routing                                  │   │
│   └──────────────────────┬──────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  Data Layer                          │   │
│   │    • Spaces                                         │   │
│   │    • Messages                                       │   │
│   │    • Artifacts (tasks, notes, decisions, etc.)      │   │
│   │    • Relationships                                  │   │
│   └──────────────────────┬──────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Dashboard (Read-Only)                   │   │
│   │    • Auto-generated widgets                         │   │
│   │    • Grid-based layout                              │   │
│   │    • Reflects understanding                         │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   SQLite Database   │
               │   (Local File)      │
               └─────────────────────┘
```

### Technology Choices

**Framework**: Next.js 16 + Tauri 2
- Modern React with App Router
- Native desktop capabilities
- Cross-platform (macOS, Windows, Linux)
- Small bundle size (~10MB vs Electron's ~150MB)

**Database**: SQLite
- Local-first by nature
- No server required
- Single-file portable storage
- Full SQL querying

**AI**: BYOK (Bring Your Own Key) in open source
- OpenAI, Anthropic, or local models
- Optional Ooozzy-hosted inference

## Open Source & Licensing

### Core Application
- Licensed under MIT
- Anyone may use, modify, fork, or sell
- Attribution must be preserved

### Ooozzy Hosted Services (Not Open Source)
- AI inference
- Authentication
- Billing
- Sync (future)

### Commercial Ethos
- Commercial use explicitly allowed
- Forks and competitors expected
- Competes on quality, velocity, trust, taste
- Not on legal friction

## Risk Management

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| AI accuracy for artifact extraction | High | Start simple, iterate based on usage |
| Offline AI inference | Medium | BYOK + local model support |
| Cross-platform bugs | Medium | Test on all target platforms |

### Product Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Users expect manual control | High | Clear positioning, onboarding |
| Structure doesn't emerge well | High | Iterate on AI prompting, user feedback |
| Scope creep | Medium | Hard constraints documented |

## Timeline

### Phase 1: Foundation (Current)
- Project setup
- Database schema
- Basic chat interface
- Space creation

### Phase 2: Core Experience
- AI integration
- Artifact extraction
- Dashboard rendering
- Widget system

### Phase 3: Polish
- UX refinement
- Performance optimization
- Documentation
- Beta release

## Stakeholders

### Project Team
- **Developer**: Primary contributor
- **AI Agent**: Development partner (Claude)

### Community
- Open source contributors (future)
- Users providing feedback

## Contact & Documentation

**Repository**: Local development
**Documentation**: `claude_docs/` directory
**Product Spec**: This file + PRODUCT_CONTEXT.md

## Final Note

> "This product exists to support thinking that unfolds over time."

If a feature does not:
- Preserve context
- Reduce cognitive load
- Improve orientation

...it does not belong here.

**Build calmly. Ship deliberately. Let structure earn its place.**
