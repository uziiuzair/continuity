/**
 * Narrative Synthesis Engine
 *
 * The brain of the two-layer memory system. Reads all memories + learnings,
 * calls the AI to produce a synthesized "mental model" narrative, and saves it
 * back to memory.db.
 *
 * Inspired by Persona's production system (152 versions, 0.9 confidence).
 * Adapted for Continuity's local-first, single-user desktop model.
 */

import { getAIClient, ChatMessage } from "@/lib/ai";
import { getMemoryDb } from "@/lib/db/memory-db";
import { isTauriContext } from "@/lib/db";

// ============================================
// TYPES
// ============================================

interface NarrativeSections {
  user: string;
  workStyle: string;
  projects: string;
  patterns: string;
  priorities: string;
  qualityCriteria: string;
  learnings: Array<{
    topic: string;
    insight: string;
    confidence: number;
    source: string;
    learnedAt: string;
  }>;
}

interface MemoryRow {
  id: string;
  key: string;
  content: string;
  type: string;
  scope: string;
  source: string;
  project_id: string | null;
  tags: string | null;
  version: number;
  updated_at: string;
}

interface LearningRow {
  id: string;
  signal_type: string;
  observation: string;
  confidence: number;
  source_thread_id: string | null;
  created_at: string;
}

interface NarrativeRow {
  id: string;
  scope: string;
  project_id: string | null;
  content: string;
  sections: string;
  version: number;
  confidence: number;
  last_synthesized_at: string;
  memory_snapshot_hash: string | null;
}

interface SynthesisResult {
  content: string;
  sections: NarrativeSections;
  confidence: number;
}

// ============================================
// SYNTHESIS PROMPT
// ============================================

const SYNTHESIS_SYSTEM_PROMPT = `You are a narrative synthesis engine for Continuity, a local-first AI workspace. Your job is to distill everything known about the user into a structured, evolving understanding.

You will receive:
1. All stored memories (with source attribution: user-set, AI-inferred, or system-detected)
2. Recent learnings extracted from conversations
3. The previous narrative (if any) with its version and confidence

Your output must be a JSON object with these fields:

{
  "content": "A 2-4 paragraph executive briefing written as a trusted advisor's mental model of this user. NOT a data dump — a synthesized understanding. Write in second person ('You are working with someone who...' or 'This user...'). Include what matters most for informing future AI interactions.",

  "sections": {
    "user": "Who this person is — their role, background, expertise level, what they care about",
    "workStyle": "How they work — communication preferences, depth vs brevity, pace, when they're most active",
    "projects": "Active projects and their status — what they're building, key decisions made, blockers",
    "patterns": "Recurring behaviors and decision patterns — how they approach problems, what triggers their interest",
    "priorities": "What matters most right now — current focus areas, urgent items, goals",
    "qualityCriteria": "What 'good' looks like — standards they hold, what they accept/reject, taste",
    "learnings": [
      {
        "topic": "Category of the insight",
        "insight": "The learned fact or pattern",
        "confidence": 0.7,
        "source": "conversation|correction|decision|explicit",
        "learnedAt": "ISO timestamp"
      }
    ]
  },

  "confidence": 0.5
}

## Confidence Scoring:
- 0.1-0.3: Minimal data, mostly guesses
- 0.4-0.6: Some signal, but many gaps
- 0.7-0.8: Good understanding, most sections populated
- 0.9-0.95: Strong understanding with corroborated insights (never go above 0.95)

## Rules:
- User-set memories (source: "user") are ground truth — state them directly
- AI-inferred memories (source: "ai") are hypotheses — frame appropriately
- Preserve ALL existing learnings from the previous narrative
- Add new learnings from the unabsorbed signals
- If a new learning contradicts an old one, keep both but adjust confidence
- Empty sections should say "Not yet understood" rather than being omitted
- The content field should read like a briefing from a trusted advisor, not a bullet list`;

// ============================================
// CORE SYNTHESIS FUNCTION
// ============================================

/**
 * Synthesize a narrative from all available signals.
 * Runs entirely in the app layer using the user's configured AI client.
 */
export async function synthesizeNarrative(
  scope: "global" | "project" = "global",
  projectId?: string
): Promise<boolean> {
  if (!isTauriContext()) return false;

  const aiClient = await getAIClient();
  if (!aiClient) return false;

  const db = await getMemoryDb();

  // 1. Gather all inputs in parallel
  const [memories, learnings, previousNarrative] = await Promise.all([
    db.select<MemoryRow[]>(
      `SELECT id, key, content, type, scope, source, project_id, tags, version, updated_at
       FROM memories WHERE archived_at IS NULL
       ORDER BY updated_at DESC`
    ),
    db.select<LearningRow[]>(
      `SELECT id, signal_type, observation, confidence, source_thread_id, created_at
       FROM learnings
       WHERE absorbed_into_narrative = 0
         AND scope = $1
         AND COALESCE(project_id, '') = COALESCE($2, '')
       ORDER BY created_at ASC`,
      [scope, projectId || ""]
    ),
    db.select<NarrativeRow[]>(
      `SELECT * FROM narratives
       WHERE scope = $1 AND COALESCE(project_id, '') = COALESCE($2, '')
       ORDER BY version DESC LIMIT 1`,
      [scope, projectId || ""]
    ),
  ]);

  // 2. Check if synthesis is needed (snapshot hash)
  const snapshotData = memories.map((m) => `${m.key}:${m.content}:${m.version}`).join("|");
  const snapshotHash = simpleHash(snapshotData + learnings.map((l) => l.observation).join("|"));

  const prev = previousNarrative[0] || null;
  if (prev && prev.memory_snapshot_hash === snapshotHash && learnings.length === 0) {
    // Nothing changed since last synthesis
    return false;
  }

  // 3. Build the synthesis prompt
  const memoryLines = memories.map((m) => {
    const sourceLabel = m.source === "user" ? "[user-set]" : m.source === "system" ? "[system]" : "[ai-inferred]";
    return `- **${m.key}** ${sourceLabel}: ${m.content} (type: ${m.type}, scope: ${m.scope}, v${m.version})`;
  });

  const learningLines = learnings.map((l) =>
    `- [${l.signal_type}] ${l.observation} (confidence: ${l.confidence})`
  );

  let userMessage = `## Current Memories (${memories.length} total)\n\n`;
  if (memoryLines.length > 0) {
    userMessage += memoryLines.join("\n") + "\n\n";
  } else {
    userMessage += "No memories stored yet.\n\n";
  }

  userMessage += `## New Learnings (${learnings.length} unabsorbed)\n\n`;
  if (learningLines.length > 0) {
    userMessage += learningLines.join("\n") + "\n\n";
  } else {
    userMessage += "No new learnings since last synthesis.\n\n";
  }

  if (prev) {
    let existingSections: NarrativeSections | null = null;
    try {
      existingSections = JSON.parse(prev.sections);
    } catch { /* ignore */ }

    userMessage += `## Previous Narrative (v${prev.version}, confidence: ${prev.confidence})\n\n`;
    userMessage += prev.content + "\n\n";

    if (existingSections?.learnings && existingSections.learnings.length > 0) {
      userMessage += `## Existing Learnings to Preserve (${existingSections.learnings.length})\n\n`;
      userMessage += existingSections.learnings
        .map((l) => `- [${l.topic}] ${l.insight} (confidence: ${l.confidence}, source: ${l.source})`)
        .join("\n");
    }
  } else {
    userMessage += "## Previous Narrative\n\nThis is the first synthesis — no previous narrative exists.\n";
  }

  userMessage += "\n\nSynthesize the above into an updated narrative. Respond with ONLY the JSON object, no markdown fences.";

  // 4. Call the AI
  const messages: ChatMessage[] = [
    { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const response = await aiClient.chat(messages);

  // 5. Parse the response
  let result: SynthesisResult;
  try {
    // Strip markdown code fences if present
    let text = response.content.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    result = JSON.parse(text);
  } catch {
    // If parsing fails, create a minimal narrative from the raw response
    result = {
      content: response.content.slice(0, 2000),
      sections: {
        user: "Not yet understood",
        workStyle: "Not yet understood",
        projects: "Not yet understood",
        patterns: "Not yet understood",
        priorities: "Not yet understood",
        qualityCriteria: "Not yet understood",
        learnings: [],
      },
      confidence: 0.3,
    };
  }

  // 6. Save the narrative
  const newVersion = prev ? prev.version + 1 : 1;
  const now = new Date().toISOString();

  if (prev) {
    await db.execute(
      `UPDATE narratives
       SET content = $1, sections = $2, version = $3, confidence = $4,
           last_synthesized_at = $5, memory_snapshot_hash = $6, updated_at = $7
       WHERE id = $8`,
      [
        result.content,
        JSON.stringify(result.sections),
        newVersion,
        Math.min(result.confidence, 0.95),
        now,
        snapshotHash,
        now,
        prev.id,
      ]
    );
  } else {
    const id = `nar-${Date.now().toString(36)}`;
    await db.execute(
      `INSERT INTO narratives (id, scope, project_id, content, sections, version, confidence,
         last_synthesized_at, memory_snapshot_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        scope,
        projectId || null,
        result.content,
        JSON.stringify(result.sections),
        1,
        Math.min(result.confidence, 0.95),
        now,
        snapshotHash,
        now,
        now,
      ]
    );
  }

  // 7. Mark learnings as absorbed
  if (learnings.length > 0) {
    const ids = learnings.map((l) => l.id);
    // Batch update — SQLite doesn't support array params, so we do it in chunks
    for (const id of ids) {
      await db.execute(
        "UPDATE learnings SET absorbed_into_narrative = 1 WHERE id = $1",
        [id]
      );
    }
  }

  return true;
}

// ============================================
// NARRATIVE READING (for system prompt)
// ============================================

/**
 * Get the current narrative content for system prompt injection.
 * Returns null if no narrative exists or not in Tauri context.
 */
export async function getNarrativeForPrompt(
  scope: "global" | "project" = "global",
  projectId?: string
): Promise<{ content: string; confidence: number; version: number; lastSynthesized: string } | null> {
  if (!isTauriContext()) return null;

  try {
    const db = await getMemoryDb();
    const rows = await db.select<NarrativeRow[]>(
      `SELECT content, confidence, version, last_synthesized_at
       FROM narratives
       WHERE scope = $1 AND COALESCE(project_id, '') = COALESCE($2, '')
       ORDER BY version DESC LIMIT 1`,
      [scope, projectId || ""]
    );

    if (rows.length === 0 || !rows[0].content) return null;

    return {
      content: rows[0].content,
      confidence: rows[0].confidence,
      version: rows[0].version,
      lastSynthesized: rows[0].last_synthesized_at,
    };
  } catch {
    return null;
  }
}

// ============================================
// SYNTHESIS SCHEDULING
// ============================================

let synthesisTimer: ReturnType<typeof setTimeout> | null = null;
let lastSynthesisAttempt = 0;
const MIN_SYNTHESIS_INTERVAL = 5 * 60 * 1000; // 5 minutes between attempts

/**
 * Check if synthesis should run and trigger it if needed.
 * Called on app launch, after conversations, and on learning threshold.
 */
export async function checkAndSynthesize(): Promise<boolean> {
  if (!isTauriContext()) return false;

  // Debounce: don't run more than once every 5 minutes
  const now = Date.now();
  if (now - lastSynthesisAttempt < MIN_SYNTHESIS_INTERVAL) return false;
  lastSynthesisAttempt = now;

  try {
    const db = await getMemoryDb();

    // Check if narrative is stale (>6 hours) or doesn't exist
    const narratives = await db.select<NarrativeRow[]>(
      "SELECT last_synthesized_at FROM narratives WHERE scope = 'global' ORDER BY version DESC LIMIT 1"
    );

    const isStale =
      narratives.length === 0 ||
      Date.now() - new Date(narratives[0].last_synthesized_at).getTime() > 6 * 60 * 60 * 1000;

    // Check unabsorbed learning count
    const learningCount = await db.select<[{ count: number }]>(
      "SELECT COUNT(*) as count FROM learnings WHERE absorbed_into_narrative = 0 AND scope = 'global'"
    );
    const hasLearnings = learningCount[0]?.count > 0;

    // Check if there are any memories to synthesize from
    const memoryCount = await db.select<[{ count: number }]>(
      "SELECT COUNT(*) as count FROM memories WHERE archived_at IS NULL"
    );
    const hasMemories = memoryCount[0]?.count > 0;

    if (!hasMemories) return false; // Nothing to synthesize from

    // Trigger if: stale + has data, OR 5+ unabsorbed learnings
    if ((isStale && hasLearnings) || (learningCount[0]?.count ?? 0) >= 5 || narratives.length === 0) {
      return await synthesizeNarrative("global");
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Schedule a synthesis check after a delay (e.g., after conversation ends).
 * Debounced — multiple calls reset the timer.
 */
export function scheduleSynthesisCheck(delayMs: number = 60_000): void {
  if (synthesisTimer) clearTimeout(synthesisTimer);
  synthesisTimer = setTimeout(() => {
    checkAndSynthesize().catch(() => {});
    synthesisTimer = null;
  }, delayMs);
}

// ============================================
// UTILITIES
// ============================================

/**
 * Simple hash for snapshot comparison (not cryptographic).
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
