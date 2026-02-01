# Active Context

**Last Updated**: 2026-02-01 (Streaming AI + Markdown rendering complete)
**Current Session Focus**: AI streaming and chat UX improvements

## Current Work

### Recently Completed (Latest Session)

- **Streaming AI Responses - COMPLETE**
  - Added `chatStream` method to `AIClient` interface
  - Implemented SSE streaming for OpenAI (parses `delta.content`)
  - Implemented event streaming for Anthropic (parses `content_block_delta`)
  - Updated `chat-provider.tsx` to stream responses incrementally
  - Messages appear progressively as AI generates text

- **Markdown Rendering in Chat - COMPLETE**
  - Installed `react-markdown` and `remark-gfm`
  - Assistant messages render with full markdown support
  - Code blocks, lists, links, headers, blockquotes styled
  - User messages remain plain text

- **Files Modified**:
  - `lib/ai/types.ts` - Added `chatStream` method to interface
  - `lib/ai/openai.ts` - Implemented streaming with SSE parsing
  - `lib/ai/anthropic.ts` - Implemented streaming with event parsing
  - `providers/chat-provider.tsx` - Incremental message updates
  - `components/chat/ChatMessage.tsx` - Markdown rendering for assistant
  - `package.json` - Added react-markdown, remark-gfm

### Active Tasks
- None currently

## Immediate Context

### Product Philosophy (Key Points)

1. **Chat Is the Write Path** - All mutations via natural language
2. **Structure Emerges** - No templates, no upfront schema
3. **Dashboards Are Read-Only** - Reflect understanding, not build
4. **Spaces = Long-Running Context** - Projects, objectives, domains
5. **Local-First** - SQLite, offline-capable, user owns data

### Core Components

| Component | Purpose | Status |
|-----------|---------|--------|
| SQLite DB | Data persistence | ✅ Working |
| Threads | Conversation containers | ✅ Working |
| Messages | Chat history | ✅ Working |
| Chat Engine | Primary interface, write path | ✅ Working (with streaming) |
| AI Clients | OpenAI/Anthropic integration | ✅ Working (with streaming) |
| Settings | API keys, preferences | ✅ Working |
| Spaces | Context containers | 📅 To Build |
| Artifacts | Derived data (tasks, notes, decisions) | 📅 To Build |
| Dashboard | Read-only projection layer | 📅 To Build |

### Hard Constraints (v1)

- Desktop-only (no web, no mobile)
- No real-time collaboration
- No manual dashboard building
- No forced accounts
- Dashboards read-only

### Project State

- Next.js 16 + Tauri 2 + React 19
- Full chat interface with streaming AI responses
- Markdown rendering for AI messages
- Thread management (create, switch, list)
- Settings panel for API key configuration
- Build passes (`npm run build`)

## Architecture Overview

### Provider Hierarchy
```
DatabaseProvider
└── ThreadsProvider
    └── ChatProvider
        └── ViewProvider
            └── App Components
```

### AI Client Architecture
```typescript
// lib/ai/types.ts
interface AIClient {
  chat(messages: ChatMessage[]): Promise<AIResponse>;
  chatStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<AIResponse>;
}
```

### Key Directories
```
lib/
├── ai/
│   ├── types.ts       # AIClient interface, ChatMessage, AIResponse
│   ├── openai.ts      # OpenAI client with streaming
│   ├── anthropic.ts   # Anthropic client with streaming
│   └── index.ts       # Client factory
├── db/
│   ├── index.ts       # Database connection
│   ├── messages.ts    # Message CRUD
│   ├── threads.ts     # Thread CRUD
│   └── settings.ts    # Settings CRUD

providers/
├── chat-provider.tsx      # Chat state, message sending with streaming
├── threads-provider.tsx   # Thread management
├── database-provider.tsx  # DB initialization
└── view-provider.tsx      # UI state (panels, views)

components/
├── chat/
│   ├── ChatMessage.tsx    # Message display with markdown
│   ├── ChatInput.tsx      # Message input
│   └── ...
├── layout/
│   ├── AppShell.tsx       # Main layout
│   └── Sidebar.tsx        # Navigation
└── settings/              # Settings UI
```

## Session History

### This Session
1. Added streaming support to AI client types
2. Implemented OpenAI SSE streaming
3. Implemented Anthropic event streaming
4. Updated chat provider for incremental message updates
5. Added markdown rendering with react-markdown
6. Verified build passes

### Key Decisions
- **Callback-based streaming**: Simple `onChunk(text)` callback vs async iterators
- **Optimistic message creation**: Empty assistant message created before streaming
- **Save on complete**: Only persist to DB when stream finishes
- **User messages plain text**: Only assistant messages get markdown rendering

## Next Steps

### Immediate Priorities

1. **Test streaming in Tauri**:
   - Run `npm run tauri dev`
   - Send messages and verify streaming works
   - Test with both OpenAI and Anthropic

2. **Implement Spaces**:
   - Space CRUD operations
   - Space switching in UI
   - Link threads to spaces

3. **AI Artifact Extraction**:
   - Parse AI responses for tasks, notes, decisions
   - Create artifacts from conversation
   - Link artifacts to source messages

### Build Order

```
Phase 2: Chat + Spaces ← We are here
├── ✅ Chat input + message display
├── ✅ Message persistence
├── ✅ AI integration (streaming)
├── 5. Space CRUD (minimal)
└── 6. Space switching

Phase 3: AI Integration
├── ✅ AI client (BYOK setup)
├── 7. Artifact extraction
├── 8. Response generation with context
└── 9. Topic detection

Phase 4: Dashboard
├── 10. Widget system
├── 11. Task list widget
├── 12. Other widgets
└── 13. Auto-layout
```

## Context for Next Session

### What's Working
- Next.js dev server runs (`npm run dev`)
- Tauri builds (`npm run tauri dev`)
- SQLite database with threads/messages
- Full chat interface with streaming
- Markdown rendering for AI responses
- Settings panel for API keys
- TypeScript build passes

### Streaming Pattern Established
```typescript
// In chat-provider.tsx
const response = await client.chatStream(aiMessages, (chunk: string) => {
  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === assistantMessageId
        ? { ...msg, content: msg.content + chunk }
        : msg
    )
  );
});
```

### Important Notes
- Test with `npm run tauri dev` (not `npm run dev`)
- Both OpenAI and Anthropic support streaming
- Markdown uses react-markdown + remark-gfm
- User messages stay plain text, assistant gets markdown
