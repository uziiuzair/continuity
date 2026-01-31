# Technical Context

**Purpose**: Technology stack, architecture, infrastructure, and technical decisions for Ooozzy

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **TypeScript**: 5.9
- **Styling**: TBD (recommend Tailwind CSS)
- **UI Components**: TBD (custom + shadcn/ui recommended)

### Backend
- **Runtime**: Tauri 2 (Rust-based)
- **Database**: SQLite via @tauri-apps/plugin-sql
- **IPC**: Tauri invoke system
- **AI**: BYOK (OpenAI, Anthropic, local models)

### Development Tools
- **Package Manager**: npm
- **Build Tool**: Next.js / Tauri CLI
- **Version Control**: Git

### Infrastructure
- **Distribution**: Tauri bundler (DMG, MSI, AppImage)
- **Database**: Local SQLite file (ooozzy.db)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Ooozzy Desktop App                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     UI Layer (React)                         │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│   │  │ Chat Panel   │  │ Space List   │  │ Dashboard Panel  │   │   │
│   │  │ (Write Path) │  │ (Navigation) │  │ (Read Only)      │   │   │
│   │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    AI Integration Layer                      │   │
│   │                                                             │   │
│   │  • Intent interpretation                                    │   │
│   │  • Artifact extraction (Task, Note, Decision, etc.)        │   │
│   │  • Topic boundary detection                                 │   │
│   │  • Space routing                                            │   │
│   │  • Conversation context management                          │   │
│   │                                                             │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     Data Access Layer                        │   │
│   │                                                             │   │
│   │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐ │   │
│   │  │ Spaces  │ │ Messages │ │ Artifacts │ │ Relationships  │ │   │
│   │  └─────────┘ └──────────┘ └───────────┘ └────────────────┘ │   │
│   │                                                             │   │
│   └────────────────────────────┬────────────────────────────────┘   │
│                                │                                    │
│                    Tauri SQL Plugin (IPC)                          │
│                                │                                    │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   SQLite Database      │
                    │   (ooozzy.db)          │
                    │                        │
                    │   • spaces             │
                    │   • messages           │
                    │   • tasks              │
                    │   • notes              │
                    │   • decisions          │
                    │   • milestones         │
                    │   • constraints        │
                    │   • tables             │
                    │   • settings           │
                    └────────────────────────┘
```

### Data Flow

**Write Path (Chat → Artifacts)**:
```
User Input
    │
    ▼
Chat Component (captures message)
    │
    ▼
AI Service (processes intent)
    │
    ├──► Create/update artifacts
    ├──► Generate response
    └──► Route to Space
    │
    ▼
Database (persist all changes)
    │
    ▼
UI Update (dashboard reflects changes)
```

**Read Path (Dashboard)**:
```
Space Selection
    │
    ▼
Query artifacts for Space
    │
    ▼
Determine visible widgets
    │
    ▼
Render dashboard (read-only)
```

### Directory Structure

```
continuity/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main app page
│   ├── chat/                    # Chat interface
│   ├── dashboard/               # Dashboard view
│   └── settings/                # Settings page
│
├── src/
│   ├── components/
│   │   ├── chat/               # Chat components
│   │   │   ├── ChatInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── Message.tsx
│   │   ├── dashboard/          # Dashboard components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Widget.tsx
│   │   │   └── widgets/        # Individual widgets
│   │   │       ├── TaskListWidget.tsx
│   │   │       ├── TimelineWidget.tsx
│   │   │       ├── NotesWidget.tsx
│   │   │       └── DecisionsWidget.tsx
│   │   ├── spaces/             # Space components
│   │   │   ├── SpaceList.tsx
│   │   │   └── SpaceItem.tsx
│   │   └── ui/                 # Base UI components
│   │
│   ├── lib/
│   │   ├── db.ts              # Database connection
│   │   ├── db/                # Database operations
│   │   │   ├── spaces.ts
│   │   │   ├── messages.ts
│   │   │   ├── artifacts.ts
│   │   │   └── migrations.ts
│   │   ├── ai/                # AI integration
│   │   │   ├── client.ts      # AI client (BYOK)
│   │   │   ├── extraction.ts  # Artifact extraction
│   │   │   └── prompts.ts     # System prompts
│   │   └── utils/             # Utilities
│   │
│   └── types/
│       ├── index.ts           # Shared types
│       ├── artifacts.ts       # Artifact types
│       └── api.ts             # API types
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   └── lib.rs            # Tauri plugins
│   └── tauri.conf.json       # Tauri config
│
├── claude_docs/               # Memory bank
└── CLAUDE.md                  # Claude behavior
```

## Database Architecture

### Schema Overview

**Core Tables**:
- `spaces` - Logical containers for context
- `messages` - Conversation history
- `tasks` - Extracted tasks
- `notes` - Extracted notes
- `decisions` - Extracted decisions
- `milestones` - Extracted milestones
- `constraints` - Extracted constraints
- `data_tables` - Structured tabular data
- `settings` - User preferences

### Table Definitions

**spaces**:
```sql
CREATE TABLE spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT,  -- soft delete
    metadata TEXT      -- JSON for flexible data
);

CREATE INDEX idx_spaces_name ON spaces(name);
CREATE INDEX idx_spaces_updated ON spaces(updated_at);
```

**messages**:
```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    metadata TEXT      -- JSON for AI response metadata
);

CREATE INDEX idx_messages_space ON messages(space_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

**tasks**:
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    source_message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
);

CREATE INDEX idx_tasks_space ON tasks(space_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
```

**notes**:
```sql
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    source_message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'insight'
        CHECK (category IN ('insight', 'reference', 'summary')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
);

CREATE INDEX idx_notes_space ON notes(space_id);
CREATE INDEX idx_notes_category ON notes(category);
```

**decisions**:
```sql
CREATE TABLE decisions (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    source_message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    description TEXT,
    rationale TEXT,
    alternatives TEXT,  -- JSON array of alternatives considered
    status TEXT DEFAULT 'confirmed'
        CHECK (status IN ('proposed', 'confirmed', 'reversed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
);

CREATE INDEX idx_decisions_space ON decisions(space_id);
CREATE INDEX idx_decisions_status ON decisions(status);
```

**milestones**:
```sql
CREATE TABLE milestones (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    source_message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    status TEXT DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'achieved', 'missed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
);

CREATE INDEX idx_milestones_space ON milestones(space_id);
CREATE INDEX idx_milestones_target ON milestones(target_date);
```

**constraints**:
```sql
CREATE TABLE constraints (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    source_message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    description TEXT,
    constraint_type TEXT DEFAULT 'general'
        CHECK (constraint_type IN ('budget', 'time', 'resource', 'technical', 'policy', 'general')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
);

CREATE INDEX idx_constraints_space ON constraints(space_id);
CREATE INDEX idx_constraints_type ON constraints(constraint_type);
```

**data_tables**:
```sql
CREATE TABLE data_tables (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES spaces(id),
    source_message_id TEXT REFERENCES messages(id),
    title TEXT NOT NULL,
    columns TEXT NOT NULL,  -- JSON array of column definitions
    rows TEXT NOT NULL,     -- JSON array of row data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_at TEXT
);

CREATE INDEX idx_data_tables_space ON data_tables(space_id);
```

**settings**:
```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Data Access Patterns

**Get Space with Artifacts**:
```typescript
interface SpaceWithArtifacts {
  space: Space;
  tasks: Task[];
  notes: Note[];
  decisions: Decision[];
  milestones: Milestone[];
  constraints: Constraint[];
  tables: DataTable[];
}

async function getSpaceWithArtifacts(spaceId: string): Promise<SpaceWithArtifacts> {
  const db = await getDb();

  const [space] = await db.select<Space[]>(
    "SELECT * FROM spaces WHERE id = $1 AND archived_at IS NULL",
    [spaceId]
  );

  const tasks = await db.select<Task[]>(
    "SELECT * FROM tasks WHERE space_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
    [spaceId]
  );

  // ... similar for other artifacts

  return { space, tasks, notes, decisions, milestones, constraints, tables };
}
```

**Create Artifact with Source Tracking**:
```typescript
async function createTask(
  spaceId: string,
  sourceMessageId: string,
  data: Omit<Task, 'id' | 'space_id' | 'source_message_id' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const db = await getDb();
  const id = crypto.randomUUID();

  await db.execute(`
    INSERT INTO tasks (id, space_id, source_message_id, title, description, status, priority, due_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [id, spaceId, sourceMessageId, data.title, data.description, data.status, data.priority, data.due_date]);

  return getTask(id);
}
```

## AI Integration

### Architecture

```
┌──────────────────────────────────────────────────┐
│                 AI Service                        │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │           Provider Abstraction             │  │
│  │  • OpenAI                                  │  │
│  │  • Anthropic                               │  │
│  │  • Local (Ollama, etc.)                    │  │
│  └────────────────────────────────────────────┘  │
│                       │                          │
│                       ▼                          │
│  ┌────────────────────────────────────────────┐  │
│  │           Intent Processing                │  │
│  │  • Message analysis                        │  │
│  │  • Artifact extraction                     │  │
│  │  • Space routing                           │  │
│  │  • Response generation                     │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### BYOK (Bring Your Own Key)

```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

// Stored in settings table
const defaultConfig: AIConfig = {
  provider: 'openai',
  model: 'gpt-4',
};
```

### Artifact Extraction Prompt

```typescript
const EXTRACTION_PROMPT = `
You are an AI assistant for Ooozzy, a local-first thinking workspace.

Your job is to:
1. Respond naturally to the user's message
2. Extract structured artifacts when appropriate

Artifact types:
- TASK: Actionable items (trigger: "need to", "should", "TODO")
- NOTE: Important information (trigger: "remember", "important", "key point")
- DECISION: Choices made (trigger: "decided", "let's go with", "the choice is")
- MILESTONE: Key dates/targets (trigger: "by [date]", "deadline", "launch")
- CONSTRAINT: Limitations (trigger: "can't", "limit", "must not")

Rules:
- Create FEWER artifacts, not more
- Only extract when intent is CLEAR
- Always link artifacts to the current Space
- Ask for clarification if uncertain

Respond in JSON format:
{
  "response": "Your natural language response",
  "artifacts": [
    { "type": "TASK", "title": "...", "description": "...", ... }
  ],
  "suggestNewSpace": null | { "name": "...", "reason": "..." }
}
`;
```

## Build & Deployment

### Development

```bash
npm run dev         # Start Next.js dev server (http://localhost:3000)
npm run tauri dev   # Start Tauri with hot reload
```

### Production Build

```bash
npm run build       # Build Next.js (static export)
npm run tauri build # Build native app
```

### Output

- **macOS**: `src-tauri/target/release/bundle/macos/Ooozzy.app`
- **Windows**: `src-tauri/target/release/bundle/msi/Ooozzy_x.x.x_x64.msi`
- **Linux**: `src-tauri/target/release/bundle/appimage/ooozzy_x.x.x_amd64.AppImage`

### Environment Variables

```bash
# .env.local (development only, not committed)
OPENAI_API_KEY=sk-...      # Optional: for AI features
ANTHROPIC_API_KEY=sk-...   # Optional: alternative provider
```

## Performance Considerations

### Database
- Enable WAL mode for better concurrent access
- Add indexes for frequently queried columns (done in schema)
- Use LIMIT for large result sets
- Consider periodic VACUUM for maintenance

### Frontend
- Lazy load components and routes
- Virtualize long message lists
- Memoize expensive computations
- Debounce search inputs

### AI
- Stream responses for better UX
- Cache conversation context
- Batch artifact extraction when possible

## Security Considerations

### Implemented
- SQLite parameterized queries (prevent injection)
- Local data storage (no cloud exposure)
- API keys stored locally, never transmitted to Ooozzy

### To Implement
- Input validation on all user data
- Secure API key storage (Tauri secure storage)
- Content Security Policy refinement

## Technical Debt

### Current
- None (fresh project)

### Anticipated
- Migration system for schema changes
- Backup/restore functionality
- Performance monitoring

## Dependencies

### Core (package.json)
```json
{
  "dependencies": {
    "@tauri-apps/plugin-sql": "^2.3.1",
    "next": "^16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.9.6",
    "@types/node": "25.1.0",
    "@types/react": "^19.2.10",
    "typescript": "5.9.3"
  }
}
```

### To Add
- `openai` - OpenAI SDK for AI integration
- `@anthropic-ai/sdk` - Anthropic SDK (alternative)
- `tailwindcss` - Styling
- `zustand` or `jotai` - State management (if needed)
