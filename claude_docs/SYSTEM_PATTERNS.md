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

### AI Client Interface

```typescript
// lib/ai/types.ts
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
  };
}

export interface AIClient {
  chat(messages: ChatMessage[]): Promise<AIResponse>;
  chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<AIResponse>;
}
```

### AI Client Factory

```typescript
// lib/ai/index.ts
import { getAIConfig } from "../db/settings";
import { OpenAIClient } from "./openai";
import { AnthropicClient } from "./anthropic";

export async function getAIClient(): Promise<AIClient | null> {
  const config = await getAIConfig();
  if (!config) return null;

  switch (config.provider) {
    case "openai":
      return new OpenAIClient({ apiKey: config.apiKey, model: config.model });
    case "anthropic":
      return new AnthropicClient({ apiKey: config.apiKey, model: config.model });
    default:
      return null;
  }
}
```

### Streaming Implementation

**OpenAI SSE Format**:
```typescript
// lib/ai/openai.ts
async chatStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void
): Promise<AIResponse> {
  const response = await fetch(`${this.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    },
    body: JSON.stringify({
      model: this.model,
      messages: openAIMessages,
      stream: true,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulatedContent = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

      const data = trimmedLine.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          accumulatedContent += delta;
          onChunk(delta);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return { content: accumulatedContent, model: this.model };
}
```

**Anthropic Event Format**:
```typescript
// lib/ai/anthropic.ts - similar but parses content_block_delta events
// Event format: event: content_block_delta
// Data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
```

### Using Streaming in Chat Provider

```typescript
// providers/chat-provider.tsx
const sendMessage = async (content: string) => {
  // 1. Create empty assistant message placeholder
  const assistantMessageId = generateId();
  const assistantMessage: Message = {
    id: assistantMessageId,
    threadId: threadId || "",
    role: "assistant",
    content: "",  // Empty initially
    createdAt: new Date(),
  };
  setMessages((prev) => [...prev, assistantMessage]);

  // 2. Stream response, updating message incrementally
  const response = await client.chatStream(aiMessages, (chunk: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, content: msg.content + chunk }
          : msg
      )
    );
  });

  // 3. Save complete message to DB
  await createMessage(threadId, "assistant", response.content);
};
```

### Tool Calling Pattern

```typescript
// lib/ai/types.ts
export interface AITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface AIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;      // For tool result messages
  toolCalls?: AIToolCall[]; // For assistant messages with tool calls
}

export interface ChatOptions {
  tools?: AITool[];
  toolChoice?: "auto" | "none" | "required";
}
```

### Tool Calling Loop

```typescript
// providers/chat-provider.tsx
const MAX_TOOL_ITERATIONS = 10;
let iterations = 0;
let currentMessages = [...aiMessages];

while (iterations < MAX_TOOL_ITERATIONS) {
  iterations++;

  const response = await client.chatStream(
    currentMessages,
    onChunk,
    { tools: getCanvasTools(), toolChoice: "auto" }
  );

  if (response.toolCalls && response.toolCalls.length > 0) {
    // IMPORTANT: Include toolCalls in assistant message for OpenAI
    currentMessages.push({
      role: "assistant",
      content: response.content || "",
      toolCalls: response.toolCalls,
    });

    // Execute tools and get results
    const results = await executeToolCalls(response.toolCalls, threadId);

    // Add tool results to messages
    currentMessages.push(...results);

    // Clear UI content for next iteration
    finalContent = "";
  } else {
    // No more tool calls, done
    break;
  }
}
```

### Tool Execution Pattern

```typescript
// lib/ai/canvas-tools.ts
export async function executeCanvasTool(
  toolCall: ToolCall,
  threadId: string
): Promise<ToolResult> {
  switch (toolCall.name) {
    case "read_canvas":
      const content = await getCanvasContent(threadId);
      return {
        toolCallId: toolCall.id,
        result: formatCanvasForAI(content),
        success: true,
      };

    case "update_block":
      const { blockId, props } = toolCall.arguments;
      // Get content, find block, update, save
      await saveCanvasContent(threadId, updatedContent);
      return {
        toolCallId: toolCall.id,
        result: `Updated block "${blockId}"`,
        success: true,
      };

    // ... other tools
  }
}
```

### OpenAI Tool Message Conversion

```typescript
// lib/ai/openai.ts
private convertMessages(messages: ChatMessage[]): OpenAIMessage[] {
  return messages.map((msg) => {
    // Tool results
    if (msg.role === "tool") {
      return {
        role: "tool",
        content: msg.content,
        tool_call_id: msg.toolCallId,  // Required
      };
    }

    // Assistant with tool calls
    if (msg.role === "assistant" && msg.toolCalls?.length > 0) {
      return {
        role: "assistant",
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      };
    }

    // Regular message
    return { role: msg.role, content: msg.content };
  });
}
```

### Anthropic Tool Message Conversion

```typescript
// lib/ai/anthropic.ts
// Tool results go in user messages with tool_result blocks
if (msg.role === "tool") {
  conversationMessages.push({
    role: "user",
    content: [{
      type: "tool_result",
      tool_use_id: msg.toolCallId,
      content: msg.content,
    }],
  });
}

// Assistant with tool calls uses content blocks
if (msg.role === "assistant" && msg.toolCalls?.length > 0) {
  const contentBlocks = [];
  if (msg.content) {
    contentBlocks.push({ type: "text", text: msg.content });
  }
  for (const tc of msg.toolCalls) {
    contentBlocks.push({
      type: "tool_use",
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments),
    });
  }
  conversationMessages.push({ role: "assistant", content: contentBlocks });
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

## Canvas Patterns

### Canvas Provider with AI API

```typescript
// providers/canvas-provider.tsx
interface CanvasContextType {
  content: CanvasContent | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  updateContent: (content: CanvasContent) => void;
  saveNow: () => Promise<void>;

  // AI API access
  aiApi: AICanvasAPI | null;
  registerEditor: (editor: BlockNoteEditor) => void;
  unregisterEditor: () => void;

  // External refresh (after DB writes)
  refreshContent: () => Promise<void>;
}
```

### Database-Backed Canvas Operations

```typescript
// lib/db/canvas.ts
export async function appendCanvasBlocks(
  threadId: string,
  blocks: SimpleBlock[]
): Promise<CanvasContent> {
  // Get existing content
  const existingContent = await getCanvasContent(threadId);

  // Convert SimpleBlocks to BlockNote format
  const newBlocks = blocks.map(simpleBlockToBlockNote);

  // Handle empty canvas (replace default paragraph)
  let updatedContent: CanvasContent;
  if (isDefaultEmpty(existingContent)) {
    updatedContent = newBlocks;
  } else {
    updatedContent = [...existingContent, ...newBlocks];
  }

  // Save to database
  await saveCanvasContent(threadId, updatedContent);

  return updatedContent;
}
```

### Editor Cursor Preservation

```typescript
// components/canvas/editor.tsx
export default function Editor() {
  // Track if change is from user editing
  const isUserEditing = useRef(false);
  const lastContentRef = useRef<string | null>(null);

  // Handle user edits
  const handleChange = () => {
    isUserEditing.current = true;
    const blocks = editor.document;
    lastContentRef.current = JSON.stringify(blocks);
    updateContent(blocks);
  };

  // Only replace content on external changes
  useEffect(() => {
    if (isUserEditing.current) {
      isUserEditing.current = false;
      return; // Skip - change came from editor
    }

    const contentJson = content ? JSON.stringify(content) : null;
    if (contentJson === lastContentRef.current) {
      return; // Skip - content hasn't changed
    }

    lastContentRef.current = contentJson;
    editor.replaceBlocks(editor.document, content);
  }, [content]);
}
```

### Canvas Tool Definitions

```typescript
// lib/ai/canvas-tools.ts
export const CANVAS_TOOLS: ToolDefinition[] = [
  {
    name: "read_canvas",
    description: "Read the current contents of the canvas...",
    parameters: { type: "object", properties: {}, required: [] },
  },
  {
    name: "add_to_canvas",
    description: "Add new blocks to the canvas...",
    parameters: {
      type: "object",
      properties: {
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["paragraph", "heading", "checkListItem", ...] },
              content: { type: "string" },
              props: { type: "object" },
            },
          },
        },
      },
      required: ["blocks"],
    },
  },
  {
    name: "update_block",
    description: "Update an existing block by ID...",
    parameters: {
      type: "object",
      properties: {
        blockId: { type: "string" },
        content: { type: "string" },
        props: { type: "object" },
      },
      required: ["blockId"],
    },
  },
  {
    name: "delete_block",
    description: "Delete a block by ID...",
    parameters: {
      type: "object",
      properties: {
        blockId: { type: "string" },
      },
      required: ["blockId"],
    },
  },
];
```

### Formatting Canvas for AI

```typescript
// lib/ai/canvas-tools.ts
function formatCanvasForAI(content: CanvasContent): string {
  const lines: string[] = ["Current canvas content:", ""];

  for (const block of content) {
    const id = block.id;
    const type = block.type;
    const props = block.props || {};
    const text = extractText(block.content);

    // Format based on type
    let prefix = "";
    switch (type) {
      case "heading":
        prefix = `[H${props.level || 1}] `;
        break;
      case "checkListItem":
        prefix = props.checked ? "[x] " : "[ ] ";
        break;
      case "bulletListItem":
        prefix = "• ";
        break;
    }

    lines.push(`ID: ${id}`);
    lines.push(`${prefix}${text}`);
    lines.push("");
  }

  return lines.join("\n");
}
```

## UI Patterns

### Markdown Rendering for AI Messages

```typescript
// components/chat/ChatMessage.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return isUser ? (
    // User messages: plain text
    <p className="whitespace-pre-wrap">{message.content}</p>
  ) : (
    // Assistant messages: markdown
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-black/10 px-1.5 py-0.5 rounded text-sm">
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-black/10 p-3 rounded-lg text-sm overflow-x-auto">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-black/10 p-3 rounded-lg overflow-x-auto my-2">
            {children}
          </pre>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {message.content}
    </ReactMarkdown>
  );
}
```

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
