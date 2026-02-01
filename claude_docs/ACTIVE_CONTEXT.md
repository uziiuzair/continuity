# Active Context

**Last Updated**: 2026-02-02 (Custom Block Editor - Phase 1)
**Current Session Focus**: Built custom block editor replacing BlockNote

## Current State Summary

Implemented Phase 1 of custom block editor. Created minimal paragraph-only editor from scratch with full control over persistence, styling, and behavior. BlockNote code kept for reference but no longer used.

---

## Recently Completed (This Session)

### 1. Custom Block Editor Components
- Created `components/canvas/Block.tsx` - Block type dispatcher
- Created `components/canvas/blocks/ParagraphBlock.tsx` - contentEditable paragraph
- Created `components/canvas/blocks/types.ts` - Block types and utilities
- Created `components/canvas/CustomEditor.tsx` - Main editor component

### 2. Canvas Provider Updates
- Made `canvas-provider.tsx` editor-agnostic
- Removed BlockNote-specific imports and types
- Added generic `EditorAPI` interface for future AI integration
- Renamed `registerEditor` → `registerEditorApi`, `unregisterEditor` → `unregisterEditorApi`

### 3. Editor Switch
- Updated `components/canvas/index.tsx` to use CustomEditor
- BlockNote editor kept as `BlockNoteEditor` export for reference
- Old editor.tsx updated to avoid build errors (removed provider calls)

### 4. Styling
- Added custom editor CSS to `globals.css`
- Paragraph blocks with placeholder text
- Focus states and hover effects

---

## Files Changed

### Created
| File | Purpose |
|------|---------|
| `components/canvas/Block.tsx` | Block type dispatcher component |
| `components/canvas/blocks/ParagraphBlock.tsx` | contentEditable paragraph |
| `components/canvas/blocks/types.ts` | EditorBlock, InlineContent types |
| `components/canvas/blocks/index.ts` | Block exports |
| `components/canvas/CustomEditor.tsx` | Main custom editor |

### Modified
| File | Changes |
|------|---------|
| `providers/canvas-provider.tsx` | Editor-agnostic API, removed BlockNote types |
| `components/canvas/index.tsx` | Switched to CustomEditor |
| `components/canvas/editor.tsx` | Disabled provider registration (kept for reference) |
| `app/globals.css` | Added custom editor styles |

---

## Custom Editor Features (Phase 1)

### Working
- Type in paragraphs
- Enter creates new paragraph after current
- Backspace on empty deletes paragraph (or clears if only one)
- Arrow up/down navigation between blocks
- Content syncs to canvas provider
- Persists to SQLite via existing flow
- Placeholder text on empty blocks

### Block State Flow
```
User types → ParagraphBlock.handleInput → onUpdate(blockId, {content})
→ CustomEditor.handleUpdate → setBlocks → useEffect → updateContent
→ CanvasProvider.updateContent → debounced saveToDb
```

---

## Architecture

```
components/canvas/
├── CustomEditor.tsx     # Main editor (manages block state)
├── Block.tsx           # Dispatches to block type components
├── blocks/
│   ├── types.ts        # EditorBlock, InlineContent
│   ├── index.ts        # Exports
│   └── ParagraphBlock.tsx  # Paragraph editing
├── editor.tsx          # OLD BlockNote (kept for reference)
└── index.tsx           # Exports CustomEditor as Editor
```

---

## Testing Checklist

### Basic Editing
- [x] Type in editor, text appears
- [x] Press Enter, new paragraph created
- [x] Backspace on empty, paragraph deleted
- [x] Arrow navigation between blocks
- [x] Refresh page, content persists
- [x] Switch threads, content preserved

### Edge Cases
- [ ] IME input (composition events)
- [ ] Copy/paste text
- [ ] Multiple paragraphs with rich content
- [ ] Very long paragraphs

---

## Component Status

| Component | Purpose | Status |
|-----------|---------|--------|
| SQLite DB | Data persistence | ✅ Working |
| Threads | Conversation containers | ✅ Working |
| Messages | Chat history | ✅ Working |
| Chat Engine | Primary interface | ✅ Working |
| AI Clients | OpenAI/Anthropic | ✅ Working |
| Canvas | Per-thread editor | ✅ Custom Editor |
| Custom Editor | Block-based editing | ✅ Phase 1 Complete |
| Database Block | Notion-style tables | ⏳ Phase 3 (to migrate) |
| Web Tools | Search, URL read, time | ✅ Implemented |
| Memory Tools | Remember/recall/forget | ✅ Implemented |
| Artifact Tools | Tasks/notes/decisions | ✅ Implemented |
| Settings | API keys | ✅ Working |
| Spaces | Context containers | 📅 To Build |

---

## Next Steps

### Phase 2: More Block Types
1. **HeadingBlock** - H1/H2/H3 with level prop
2. **BulletListBlock** - Bullet list items
3. **NumberedListBlock** - Numbered list items
4. **CheckListBlock** - Checkbox items
5. **Slash Menu** - "/" to insert block types

### Phase 3: Database Block
1. Move database components to work without BlockNote wrapper
2. `DatabaseBlock.tsx` renders directly in custom editor
3. Same context/table components, simpler integration

### Phase 4: Advanced Features
- Keyboard navigation enhancements
- Drag to reorder blocks
- Copy/paste blocks
- Undo/redo
- Rich text formatting (bold, italic, etc.)

---

## Why Custom Editor

**Problems with BlockNote:**
- Persistence issues with custom blocks (programmatic updates don't trigger onChange)
- Styling conflicts hard to override
- Heavy dependency for features not fully used
- Custom blocks don't integrate cleanly

**Benefits of Custom:**
- Full control over persistence flow
- Simple, debuggable code
- Easy styling
- Lightweight - only what we need
- Direct state → provider → SQLite path
