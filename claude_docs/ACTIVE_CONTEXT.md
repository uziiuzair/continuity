# Active Context

**Last Updated**: 2026-02-01 (Database setup with test UI complete)
**Current Session Focus**: Database infrastructure foundation

## Current Work

### Recently Completed (Latest Session)

- **SQLite Database Setup & Test UI - COMPLETE**
  - Fixed broken top-level await in `db.ts` with lazy initialization pattern
  - Created type-safe CRUD service (`db-service.ts`)
  - Built test UI component for database verification
  - Added `@/*` path alias to tsconfig.json

  - **Files Created/Modified**:
    - `src/lib/db.ts` - Fixed async init with `getDb()` + `isTauriContext()`
    - `src/lib/db-service.ts` - NEW: Schema init + CRUD for test_items
    - `app/components/DbTest.tsx` - NEW: Test UI component
    - `app/page.tsx` - Renders DbTest component
    - `tsconfig.json` - Added baseUrl + paths for `@/*` alias

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
| SQLite DB | Data persistence | ✅ Working (test schema) |
| Chat Engine | Primary interface, write path | 📅 To Build |
| Spaces | Context containers | 📅 To Build |
| Artifacts | Derived data (tasks, notes, decisions) | 📅 To Build |
| Dashboard | Read-only projection layer | 📅 To Build |
| AI Service | Intent interpretation, extraction | 📅 To Build |

### Hard Constraints (v1)

- Desktop-only (no web, no mobile)
- No real-time collaboration
- No manual dashboard building
- No forced accounts
- Dashboards read-only

### Project State

- Next.js 16 + Tauri 2 project with working database
- Test UI verifies SQLite read/write operations
- Path aliases configured (`@/*` → `src/*`)
- Build passes (`npm run build`)
- Ready to implement real schema

## Session History

### This Session
1. Fixed `src/lib/db.ts` top-level await issue
2. Created `src/lib/db-service.ts` with CRUD operations
3. Built `app/components/DbTest.tsx` test UI
4. Added path aliases to tsconfig.json
5. Verified build passes

### Key Decisions
- **Lazy database init**: `getDb()` function instead of module-level await
- **Tauri context check**: `isTauriContext()` for graceful degradation in browser
- **Test schema**: `test_items` table for verification (will be dropped later)

## Next Steps

### Immediate Priorities

1. **Verify in Tauri** (manual test):
   - Run `npm run tauri dev`
   - Add/delete items to verify persistence
   - Close and reopen to verify data survives

2. **Initialize Git Repository**:
   - `git init`
   - Create `.gitignore`
   - Initial commit

3. **Implement Real Schema**:
   - Create migration with spaces, messages, artifacts tables
   - Drop test_items table
   - Implement actual CRUD services

4. **TypeScript Types**:
   - Define types for all artifacts
   - Define types for API responses
   - Create shared type exports

### Build Order (Recommended)

```
Phase 1: Foundation ← We are here
├── 1. ✅ Database setup + test verification
├── 2. Git + .gitignore
├── 3. Real database schema + migrations
└── 4. TypeScript types + basic layout

Phase 2: Chat + Spaces
├── 5. Space CRUD (minimal)
├── 6. Chat input + message display
├── 7. Message persistence
└── 8. Space switching

Phase 3: AI Integration
├── 9. AI client (BYOK setup)
├── 10. Artifact extraction
├── 11. Response generation
└── 12. Topic detection

Phase 4: Dashboard
├── 13. Widget system
├── 14. Task list widget
├── 15. Other widgets
└── 16. Auto-layout
```

## Context for Next Session

### What's Working
- Next.js dev server runs (`npm run dev`)
- Tauri builds (`npm run tauri dev`)
- SQLite database with test_items table
- Path aliases (`@/*`)
- TypeScript build passes

### Database Pattern Established
```typescript
// Lazy initialization
import { getDb, isTauriContext } from "@/lib/db";

// CRUD pattern
const db = await getDb();
await db.execute("INSERT...", [params]);
const rows = await db.select<Type[]>("SELECT...");
```

### Important Notes
- Test with `npm run tauri dev` (not `npm run dev`)
- Database file: `~/Library/Application Support/continuity/test.db`
- Drop `test_items` table when implementing real schema
