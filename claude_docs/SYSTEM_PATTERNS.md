# System Patterns

**Purpose**: Code patterns, conventions, and best practices for Ooozzy

## Architecture Patterns

### Component Organization

**Structure**:
```
src/
├── components/
│   ├── chat/              # Chat interface components
│   │   ├── ChatPanel.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MessageList.tsx
│   │   └── Message.tsx
│   ├── dashboard/         # Dashboard components (read-only)
│   │   ├── Dashboard.tsx
│   │   ├── Widget.tsx
│   │   └── widgets/
│   │       ├── TaskListWidget.tsx
│   │       ├── TimelineWidget.tsx
│   │       ├── NotesWidget.tsx
│   │       └── DecisionsWidget.tsx
│   ├── spaces/            # Space navigation
│   │   ├── SpaceList.tsx
│   │   └── SpaceItem.tsx
│   └── ui/                # Base UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── lib/
│   ├── db.ts             # Database connection singleton
│   ├── db/               # Database operations
│   │   ├── spaces.ts
│   │   ├── messages.ts
│   │   └── artifacts.ts
│   ├── ai/               # AI integration
│   │   ├── client.ts
│   │   ├── extraction.ts
│   │   └── prompts.ts
│   └── utils/            # Utilities
└── types/
    ├── index.ts          # Re-exports
    ├── artifacts.ts      # Artifact types
    └── api.ts            # API response types
```

**Hierarchy**:
- **Pages** (`app/`): Route-level, data fetching
- **Feature Components** (`components/chat/`, `components/dashboard/`): Domain-specific
- **UI Components** (`components/ui/`): Reusable primitives
- **Lib** (`lib/`): Business logic, no UI

### Server vs Client Components

**Default: Server Components**
```typescript
// app/page.tsx - Server Component (default)
export default async function Page() {
  return <AppLayout />;
}
```

**Use "use client" When**:
- useState, useEffect needed
- Event handlers (onClick, onChange)
- Browser/Tauri APIs
- Real-time updates

```typescript
// components/chat/ChatInput.tsx - Client Component
"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/db/messages";

export function ChatInput({ spaceId }: { spaceId: string }) {
  const [message, setMessage] = useState("");
  // ...
}
```

### Three-Panel Layout Pattern

**Main Layout**:
```typescript
// app/page.tsx
export default function AppPage() {
  return (
    <div className="flex h-screen">
      {/* Left: Space Navigation */}
      <aside className="w-64 border-r">
        <SpaceList />
      </aside>

      {/* Center: Chat (Write Path) */}
      <main className="flex-1 flex flex-col">
        <ChatPanel />
      </main>

      {/* Right: Dashboard (Read-Only) */}
      <aside className="w-96 border-l">
        <Dashboard />
      </aside>
    </div>
  );
}
```

## Database Access Patterns

### Connection Singleton

```typescript
// src/lib/db.ts
import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:ooozzy.db");
    await runMigrations(dbInstance);
  }
  return dbInstance;
}
```

### CRUD Pattern with Soft Deletes

```typescript
// src/lib/db/spaces.ts
import { getDb } from "../db";
import type { Space, NewSpace } from "@/types";

export async function getSpaces(): Promise<Space[]> {
  const db = await getDb();
  return db.select<Space[]>(
    "SELECT * FROM spaces WHERE archived_at IS NULL ORDER BY updated_at DESC"
  );
}

export async function getSpace(id: string): Promise<Space | null> {
  const db = await getDb();
  const [space] = await db.select<Space[]>(
    "SELECT * FROM spaces WHERE id = $1 AND archived_at IS NULL",
    [id]
  );
  return space || null;
}

export async function createSpace(data: NewSpace): Promise<Space> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO spaces (id, name, description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, data.name, data.description || null, now, now]
  );

  return getSpace(id) as Promise<Space>;
}

export async function updateSpace(id: string, data: Partial<Space>): Promise<Space> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Build dynamic update query
  const updates: string[] = ["updated_at = $1"];
  const values: unknown[] = [now];
  let paramIndex = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  values.push(id);

  await db.execute(
    `UPDATE spaces SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    values
  );

  return getSpace(id) as Promise<Space>;
}

// Soft delete - never hard delete
export async function archiveSpace(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE spaces SET archived_at = $1 WHERE id = $2",
    [new Date().toISOString(), id]
  );
}
```

### Artifact with Source Tracking

```typescript
// src/lib/db/artifacts.ts
import { getDb } from "../db";
import type { Task, NewTask } from "@/types";

export async function createTask(
  spaceId: string,
  sourceMessageId: string,
  data: NewTask
): Promise<Task> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO tasks
     (id, space_id, source_message_id, title, description, status, priority, due_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      spaceId,
      sourceMessageId,  // ALWAYS track source
      data.title,
      data.description || null,
      data.status || "pending",
      data.priority || "medium",
      data.due_date || null,
      now,
      now,
    ]
  );

  return getTask(id) as Promise<Task>;
}
```

### Space with All Artifacts

```typescript
// src/lib/db/spaces.ts
import type { SpaceWithArtifacts } from "@/types";

export async function getSpaceWithArtifacts(
  spaceId: string
): Promise<SpaceWithArtifacts | null> {
  const db = await getDb();

  const [space] = await db.select<Space[]>(
    "SELECT * FROM spaces WHERE id = $1 AND archived_at IS NULL",
    [spaceId]
  );

  if (!space) return null;

  const [tasks, notes, decisions, milestones, constraints, tables] =
    await Promise.all([
      db.select<Task[]>(
        "SELECT * FROM tasks WHERE space_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
        [spaceId]
      ),
      db.select<Note[]>(
        "SELECT * FROM notes WHERE space_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
        [spaceId]
      ),
      db.select<Decision[]>(
        "SELECT * FROM decisions WHERE space_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
        [spaceId]
      ),
      db.select<Milestone[]>(
        "SELECT * FROM milestones WHERE space_id = $1 AND archived_at IS NULL ORDER BY target_date ASC",
        [spaceId]
      ),
      db.select<Constraint[]>(
        "SELECT * FROM constraints WHERE space_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
        [spaceId]
      ),
      db.select<DataTable[]>(
        "SELECT * FROM data_tables WHERE space_id = $1 AND archived_at IS NULL ORDER BY created_at DESC",
        [spaceId]
      ),
    ]);

  return { space, tasks, notes, decisions, milestones, constraints, tables };
}
```

## Type Definition Patterns

### Entity Types

```typescript
// src/types/artifacts.ts

// Base fields for all artifacts
interface BaseArtifact {
  id: string;
  space_id: string;
  source_message_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Task
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task extends BaseArtifact {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
}

export type NewTask = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "status" | "priority" | "due_date">>;

// Note
export type NoteCategory = "insight" | "reference" | "summary";

export interface Note extends BaseArtifact {
  title: string;
  content: string;
  category: NoteCategory;
}

export type NewNote = Pick<Note, "title" | "content"> &
  Partial<Pick<Note, "category">>;

// Decision
export type DecisionStatus = "proposed" | "confirmed" | "reversed";

export interface Decision extends BaseArtifact {
  title: string;
  description: string | null;
  rationale: string | null;
  alternatives: string | null; // JSON array
  status: DecisionStatus;
}

// Milestone
export type MilestoneStatus = "upcoming" | "achieved" | "missed";

export interface Milestone extends BaseArtifact {
  title: string;
  description: string | null;
  target_date: string | null;
  status: MilestoneStatus;
}

// Constraint
export type ConstraintType =
  | "budget"
  | "time"
  | "resource"
  | "technical"
  | "policy"
  | "general";

export interface Constraint extends BaseArtifact {
  title: string;
  description: string | null;
  constraint_type: ConstraintType;
}
```

### API Response Types

```typescript
// src/types/api.ts

// AI extraction response
export interface AIResponse {
  response: string;
  artifacts: ExtractedArtifact[];
  suggestNewSpace: {
    name: string;
    reason: string;
  } | null;
}

export type ExtractedArtifact =
  | { type: "TASK"; title: string; description?: string; priority?: string; due_date?: string }
  | { type: "NOTE"; title: string; content: string; category?: string }
  | { type: "DECISION"; title: string; rationale?: string }
  | { type: "MILESTONE"; title: string; target_date?: string }
  | { type: "CONSTRAINT"; title: string; constraint_type?: string };

// Composite types
export interface SpaceWithArtifacts {
  space: Space;
  tasks: Task[];
  notes: Note[];
  decisions: Decision[];
  milestones: Milestone[];
  constraints: Constraint[];
  tables: DataTable[];
}
```

## AI Integration Patterns

### AI Client Abstraction

```typescript
// src/lib/ai/client.ts
import type { AIConfig, AIResponse } from "@/types";
import { getSetting } from "../db/settings";

export async function getAIClient(): Promise<AIClient> {
  const config = await getAIConfig();

  switch (config.provider) {
    case "openai":
      return new OpenAIClient(config);
    case "anthropic":
      return new AnthropicClient(config);
    case "local":
      return new LocalClient(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

interface AIClient {
  chat(messages: Message[], systemPrompt: string): Promise<AIResponse>;
}
```

### Artifact Extraction

```typescript
// src/lib/ai/extraction.ts
import { EXTRACTION_PROMPT } from "./prompts";
import { getAIClient } from "./client";
import type { Message, AIResponse, ExtractedArtifact } from "@/types";

export async function processMessage(
  userMessage: string,
  spaceContext: SpaceWithArtifacts,
  conversationHistory: Message[]
): Promise<AIResponse> {
  const client = await getAIClient();

  // Build context from space artifacts
  const contextPrompt = buildContextPrompt(spaceContext);

  // Combine prompts
  const systemPrompt = `${EXTRACTION_PROMPT}\n\nCurrent Space Context:\n${contextPrompt}`;

  // Get AI response
  const response = await client.chat(
    [...conversationHistory, { role: "user", content: userMessage }],
    systemPrompt
  );

  return response;
}

function buildContextPrompt(space: SpaceWithArtifacts): string {
  const parts: string[] = [];

  parts.push(`Space: ${space.space.name}`);

  if (space.tasks.length > 0) {
    parts.push(`\nTasks (${space.tasks.length}):`);
    space.tasks.slice(0, 5).forEach(t => {
      parts.push(`  - [${t.status}] ${t.title}`);
    });
  }

  // Similar for other artifacts...

  return parts.join("\n");
}
```

## UI Patterns

### Chat Input with Submission

```typescript
// src/components/chat/ChatInput.tsx
"use client";

import { useState, FormEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(message.trim());
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What are you working on?"
        disabled={disabled || submitting}
        className="w-full p-3 border rounded-lg resize-none"
        rows={3}
      />
      <button
        type="submit"
        disabled={disabled || submitting || !message.trim()}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
```

### Widget with Conditional Rendering

```typescript
// src/components/dashboard/widgets/TaskListWidget.tsx
"use client";

import type { Task } from "@/types";

interface TaskListWidgetProps {
  tasks: Task[];
}

export function TaskListWidget({ tasks }: TaskListWidgetProps) {
  // Don't render if no tasks (widget emerges only when data exists)
  if (tasks.length === 0) return null;

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-lg mb-3">Tasks</h3>

      {inProgressTasks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">In Progress</h4>
          <ul className="space-y-2">
            {inProgressTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}

      {pendingTasks.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Pending</h4>
          <ul className="space-y-2">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TaskItem({ task }: { task: Task }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`w-2 h-2 rounded-full ${
          task.priority === "urgent"
            ? "bg-red-500"
            : task.priority === "high"
            ? "bg-orange-500"
            : "bg-gray-400"
        }`}
      />
      <span>{task.title}</span>
      {task.due_date && (
        <span className="text-gray-400 text-xs ml-auto">
          {formatDate(task.due_date)}
        </span>
      )}
    </li>
  );
}
```

### Dashboard with Dynamic Widgets

```typescript
// src/components/dashboard/Dashboard.tsx
"use client";

import type { SpaceWithArtifacts } from "@/types";
import { TaskListWidget } from "./widgets/TaskListWidget";
import { TimelineWidget } from "./widgets/TimelineWidget";
import { NotesWidget } from "./widgets/NotesWidget";
import { DecisionsWidget } from "./widgets/DecisionsWidget";
import { ConstraintsWidget } from "./widgets/ConstraintsWidget";

interface DashboardProps {
  data: SpaceWithArtifacts | null;
  loading?: boolean;
}

export function Dashboard({ data, loading }: DashboardProps) {
  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500">
        Select a space to view dashboard
      </div>
    );
  }

  // Check if any artifacts exist
  const hasArtifacts =
    data.tasks.length > 0 ||
    data.notes.length > 0 ||
    data.decisions.length > 0 ||
    data.milestones.length > 0 ||
    data.constraints.length > 0;

  if (!hasArtifacts) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No structure yet.</p>
        <p className="text-sm mt-2">
          Start chatting to build context for this space.
        </p>
      </div>
    );
  }

  // Widgets appear only when data exists (emergent structure)
  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <h2 className="font-bold text-xl">{data.space.name}</h2>

      {/* Each widget handles its own visibility */}
      <TaskListWidget tasks={data.tasks} />
      <TimelineWidget milestones={data.milestones} />
      <NotesWidget notes={data.notes} />
      <DecisionsWidget decisions={data.decisions} />
      <ConstraintsWidget constraints={data.constraints} />
    </div>
  );
}
```

## Code Conventions

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `ChatInput.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| Files (db ops) | camelCase | `spaces.ts` |
| Components | PascalCase | `function ChatInput()` |
| Hooks | camelCase + use | `useSpaces()` |
| Types/Interfaces | PascalCase | `interface Task` |
| Functions | camelCase | `getSpaces()` |
| Constants | UPPER_SNAKE | `MAX_MESSAGE_LENGTH` |
| DB tables | snake_case | `data_tables` |

### Import Order

```typescript
// 1. React/Next
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import Database from "@tauri-apps/plugin-sql";

// 3. Internal components
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/Button";

// 4. Internal lib/utils
import { getSpaces } from "@/lib/db/spaces";
import { formatDate } from "@/lib/utils/date";

// 5. Types (always last, with `type` keyword)
import type { Space, Task } from "@/types";
```

### Error Handling

```typescript
// Database operations - return result object
export async function createSpace(data: NewSpace): Promise<{
  success: boolean;
  data?: Space;
  error?: string;
}> {
  try {
    const space = await createSpaceInternal(data);
    return { success: true, data: space };
  } catch (error) {
    console.error("Failed to create space:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Component error handling
function SpaceList() {
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const result = await createSpace({ name: "New Space" });
    if (!result.success) {
      setError(result.error ?? "Failed to create space");
    }
  };

  return (
    <div>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      {/* ... */}
    </div>
  );
}
```

## Testing Patterns (Future)

```typescript
// Example test structure
import { describe, it, expect, beforeEach } from "vitest";
import { createSpace, getSpace, archiveSpace } from "@/lib/db/spaces";

describe("spaces", () => {
  beforeEach(async () => {
    // Reset database state
  });

  it("creates a space with name", async () => {
    const result = await createSpace({ name: "Test Space" });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Test Space");
  });

  it("soft deletes a space", async () => {
    const { data: space } = await createSpace({ name: "To Archive" });
    await archiveSpace(space!.id);

    const found = await getSpace(space!.id);
    expect(found).toBeNull(); // archived spaces not returned
  });
});
```
