# Product Context

**Purpose**: Product features, user requirements, and functional specifications for Ooozzy

## Feature Overview

### Core Components

**Chat Engine** - Primary
- Primary interface for all user interaction
- Accepts natural language input
- Routes intent to correct Space
- Creates or updates structured artifacts

**Spaces** - Containers
- Logical containers for context
- Automatically associated with conversations
- Each Space has its own dashboard
- Represents long-running objectives/projects

**Artifacts** - Derived Data
- Structured objects extracted from chat
- NOT manually created in v1
- Types: Tasks, Milestones, Notes, Decisions, Constraints, Tables

**Dashboard** - Projection Layer
- Grid-based layout
- Read-only in v1
- Widgets appear only when relevant data exists
- Reflects understanding, not customization

**Graph View** - Later Feature
- Visualizes relationships between Spaces, Messages, Artifacts, Entities
- Built on explicit nodes and edges
- Scoped by Space or neighborhood

---

## Artifact Types

### Tasks
**Purpose**: Actionable items extracted from conversation
**Fields**:
- id, title, description
- status: pending | in_progress | completed
- priority: low | medium | high | urgent
- due_date (optional)
- source_message_id (traceability)
- space_id

**Extraction Triggers**:
- "I need to..."
- "We should..."
- "TODO:"
- "Don't forget to..."
- Action items from discussion

---

### Milestones
**Purpose**: Key dates or targets in a project
**Fields**:
- id, title, description
- target_date
- status: upcoming | achieved | missed
- source_message_id
- space_id

**Extraction Triggers**:
- "By [date], we need..."
- "The deadline is..."
- "Launch on..."
- Explicit goal statements

---

### Notes
**Purpose**: Important information to remember
**Fields**:
- id, title, content
- category: insight | reference | summary
- source_message_id
- space_id

**Extraction Triggers**:
- "Remember that..."
- "Important:"
- "Key point:"
- Summarizable insights from discussion

---

### Decisions
**Purpose**: Choices made during planning
**Fields**:
- id, title, description
- rationale (why this decision)
- alternatives_considered (optional)
- status: proposed | confirmed | reversed
- source_message_id
- space_id

**Extraction Triggers**:
- "We decided to..."
- "Let's go with..."
- "The choice is..."
- Clear commitment statements

---

### Constraints
**Purpose**: Limitations or boundaries to respect
**Fields**:
- id, title, description
- type: budget | time | resource | technical | policy
- source_message_id
- space_id

**Extraction Triggers**:
- "We can't..."
- "The limit is..."
- "Must not exceed..."
- "Constraint:"

---

### Tables (Structured Data)
**Purpose**: Tabular information (e.g., budgets, lists, comparisons)
**Fields**:
- id, title
- columns: JSON array of column definitions
- rows: JSON array of row data
- source_message_id
- space_id

**Extraction Triggers**:
- Financial discussions with numbers
- Comparison of options
- Lists with consistent structure

---

## Widget Specifications

### Task List Widget
**Purpose**: Show pending and recent tasks
**Content**:
- List of tasks grouped by status
- Priority indicators
- Due dates if set
**Visibility**: Appears when tasks exist

---

### Timeline Widget
**Purpose**: Show milestones and key dates
**Content**:
- Chronological view of milestones
- Status indicators
- Relative to today
**Visibility**: Appears when milestones exist

---

### Notes Summary Widget
**Purpose**: Key insights and references
**Content**:
- Recent notes
- Grouped by category
**Visibility**: Appears when notes exist

---

### Decisions Widget
**Purpose**: Track choices made
**Content**:
- List of decisions
- Rationale visible on hover/expand
**Visibility**: Appears when decisions exist

---

### Constraints Widget
**Purpose**: Show active limitations
**Content**:
- List of constraints by type
- Visual indicators for severity
**Visibility**: Appears when constraints exist

---

### Financial Table Widget
**Purpose**: Display budget/financial data
**Content**:
- Table with numbers, calculations
- Totals and summaries
**Visibility**: Appears when financial tables exist

---

## User Flows

### Flow 1: New User - First Conversation

```
User opens app
    │
    ▼
Empty state with chat input
"What are you working on?"
    │
    ▼
User types: "I'm planning a product launch for March"
    │
    ▼
AI responds + creates:
  - New Space: "Product Launch"
  - Milestone: "Launch" (March)
    │
    ▼
Dashboard appears with Timeline widget
```

---

### Flow 2: Ongoing Work - Task Extraction

```
User in "Product Launch" Space
    │
    ▼
User types: "I need to finalize pricing by next week
             and prepare the landing page"
    │
    ▼
AI responds + creates:
  - Task: "Finalize pricing" (due: next week)
  - Task: "Prepare landing page"
    │
    ▼
Dashboard updates: Task List widget appears/updates
```

---

### Flow 3: Decision Recording

```
User discussing options
    │
    ▼
User types: "Let's go with the freemium model because
             it aligns with our growth goals"
    │
    ▼
AI responds + creates:
  - Decision: "Use freemium model"
  - Rationale: "Aligns with growth goals"
    │
    ▼
Dashboard updates: Decisions widget appears/updates
```

---

### Flow 4: Space Switching

```
User in "Product Launch" Space
    │
    ▼
User types: "Let's talk about my investment portfolio"
    │
    ▼
AI detects topic shift
AI asks: "This seems like a different topic.
         Create new Space 'Investment Portfolio'?"
    │
    ▼
User confirms → New Space created
Conversation continues in new context
```

---

## Business Rules

### Artifact Creation Rules

1. **Sparsity**: Create fewer artifacts, not more
   - Only extract when intent is clear
   - Prefer waiting over premature creation
   - Quality over quantity

2. **Traceability**: Every artifact links to source
   - Must have source_message_id
   - User can always see "why this exists"

3. **Reversibility**: Changes can be undone
   - Soft delete, not hard delete
   - History preserved

4. **Coherence**: Artifacts belong to one Space
   - Cross-Space references via graph (later)
   - Space is the primary organizational unit

---

### Space Rules

1. **Auto-Creation**: AI can suggest new Spaces
   - When topic clearly differs from current
   - User must confirm

2. **Persistence**: Spaces are long-lived
   - Represent ongoing work, not single conversations
   - Multiple conversations per Space

3. **Context**: Space provides conversation context
   - AI knows what's in the Space
   - Can reference previous artifacts

---

### Dashboard Rules

1. **Read-Only**: No manual editing in v1
   - Reflects data, doesn't create it
   - Future: limited editing

2. **Emergence**: Widgets appear when data exists
   - No empty placeholders
   - No configuration needed

3. **Orientation**: Purpose is understanding
   - What's the current state?
   - What's coming up?
   - What decisions were made?

---

## AI Behavior Specifications

### Intent Interpretation

**Artifact Detection**:
- Look for action language (verbs + objects)
- Look for commitment language ("will", "going to", "decided")
- Look for constraint language ("can't", "must not", "limit")
- Look for temporal markers (dates, deadlines)

**Confidence Threshold**:
- High confidence: Create artifact immediately
- Medium confidence: Ask for clarification
- Low confidence: Continue conversation without extraction

---

### Topic Boundary Detection

**Signals for New Space**:
- Explicit domain shift ("now about X...")
- Unrelated keywords
- Time gap in conversation
- User explicitly asks

**Response**:
- Suggest new Space
- Wait for confirmation
- Preserve current Space if declined

---

### Conversation Style

**The AI should**:
- Be a thinking partner, not an assistant
- Ask clarifying questions
- Summarize understanding
- Suggest structure when appropriate
- Avoid premature formalization

**The AI should NOT**:
- Act like a generic chatbot
- Create structure without clear signal
- Over-organize early conversations
- Force templates or schemas

---

## Validation Rules

### Task Validation
- Title: Required, 1-200 characters
- Status: Must be valid enum value
- space_id: Must exist

### Space Validation
- Name: Required, 1-100 characters
- No duplicate names per user

### Message Validation
- Content: Required, 1-50000 characters
- space_id: Must exist
- role: 'user' | 'assistant'

---

## Error Handling

### AI Errors
- If artifact extraction fails: Continue conversation, log error
- If Space routing fails: Stay in current Space
- Always preserve user message

### Database Errors
- Show user-friendly error message
- Log detailed error
- Never lose user input

---

## Roadmap

### v1.0 - Core Experience
- ✅ Project setup
- 🔄 Chat engine
- 🔄 Space management
- 📅 Basic artifact extraction
- 📅 Dashboard with widgets

### v1.1 - Polish
- 📅 Improved artifact extraction
- 📅 Better dashboard layout
- 📅 Search functionality
- 📅 Conversation history

### v2.0 - Enhanced Features
- 💡 Limited dashboard editing
- 💡 Graph view
- 💡 Cross-device sync
- 💡 Team Spaces

---

## Known Limitations (v1)

1. **No Manual Creation**
   - Cannot create tasks/notes manually
   - All structure from chat
   - By design, not a bug

2. **Read-Only Dashboard**
   - Cannot rearrange widgets
   - Cannot edit artifacts directly
   - Future: limited editing

3. **Single User**
   - No collaboration
   - No sharing
   - Future: Team Spaces

4. **Local Only**
   - No sync
   - No backup (manual file backup)
   - Future: Optional cloud sync

5. **AI Dependency**
   - Needs API key for full functionality
   - Basic mode without AI (limited)
