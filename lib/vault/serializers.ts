/**
 * Vault Serializers
 *
 * Convert Continuity entities (artifacts, threads, journal entries)
 * into Obsidian-compatible markdown with frontmatter.
 */

export interface SerializeOptions {
  includeSourceNote?: boolean;
}

/**
 * Serialize a task artifact to markdown
 */
export function serializeTask(
  task: {
    title: string;
    description?: string | null;
    status?: string;
    priority?: string;
    due_date?: string | null;
  },
  options: SerializeOptions = {}
): string {
  const frontmatter: Record<string, string> = {
    source: "continuity",
    type: "task",
    status: task.status || "pending",
    priority: task.priority || "medium",
    created: new Date().toISOString(),
  };
  if (task.due_date) frontmatter.due = task.due_date;

  const parts = [formatFrontmatter(frontmatter), "", `# ${task.title}`];

  if (task.description) {
    parts.push("", task.description);
  }

  if (options.includeSourceNote !== false) {
    parts.push(
      "",
      `> Synced from Continuity on ${new Date().toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

/**
 * Serialize a note artifact to markdown
 */
export function serializeNote(
  note: {
    title: string;
    content: string;
    category?: string;
  },
  options: SerializeOptions = {}
): string {
  const frontmatter: Record<string, string> = {
    source: "continuity",
    type: "note",
    category: note.category || "insight",
    created: new Date().toISOString(),
  };

  const parts = [formatFrontmatter(frontmatter), "", `# ${note.title}`, "", note.content];

  if (options.includeSourceNote !== false) {
    parts.push(
      "",
      `> Synced from Continuity on ${new Date().toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

/**
 * Serialize a decision artifact to markdown
 */
export function serializeDecision(
  decision: {
    title: string;
    description?: string | null;
    rationale?: string | null;
    status?: string;
  },
  options: SerializeOptions = {}
): string {
  const frontmatter: Record<string, string> = {
    source: "continuity",
    type: "decision",
    status: decision.status || "confirmed",
    created: new Date().toISOString(),
  };

  const parts = [formatFrontmatter(frontmatter), "", `# ${decision.title}`];

  if (decision.description) {
    parts.push("", decision.description);
  }

  if (decision.rationale) {
    parts.push("", "## Rationale", "", decision.rationale);
  }

  if (options.includeSourceNote !== false) {
    parts.push(
      "",
      `> Synced from Continuity on ${new Date().toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

/**
 * Serialize a conversation thread to markdown
 */
export function serializeThread(
  thread: {
    title: string;
    messages: { role: string; content: string; createdAt: Date }[];
    summary?: string;
  },
  options: SerializeOptions = {}
): string {
  const frontmatter: Record<string, string> = {
    source: "continuity",
    type: "thread",
    created: new Date().toISOString(),
  };

  const parts = [formatFrontmatter(frontmatter), "", `# ${thread.title}`];

  if (thread.summary) {
    parts.push("", "## Summary", "", thread.summary);
  }

  parts.push("", "## Conversation");

  for (const msg of thread.messages) {
    const role = msg.role === "user" ? "User" : "Assistant";
    const time = msg.createdAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    parts.push("", `### ${role} (${time})`, "", msg.content);
  }

  if (options.includeSourceNote !== false) {
    parts.push(
      "",
      `> Synced from Continuity on ${new Date().toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

/**
 * Serialize a journal entry to markdown
 */
export function serializeJournalEntry(
  entry: {
    date: string;
    content: string;
    mood?: string;
  },
  options: SerializeOptions = {}
): string {
  const frontmatter: Record<string, string> = {
    source: "continuity",
    type: "journal",
    date: entry.date,
    created: new Date().toISOString(),
  };
  if (entry.mood) frontmatter.mood = entry.mood;

  const parts = [
    formatFrontmatter(frontmatter),
    "",
    `# Journal — ${entry.date}`,
    "",
    entry.content,
  ];

  if (options.includeSourceNote !== false) {
    parts.push(
      "",
      `> Synced from Continuity on ${new Date().toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

/**
 * Serialize plain markdown content with source frontmatter
 */
export function serializeMarkdown(
  title: string,
  content: string,
  type: string = "note"
): string {
  const frontmatter: Record<string, string> = {
    source: "continuity",
    type,
    created: new Date().toISOString(),
  };

  return [formatFrontmatter(frontmatter), "", `# ${title}`, "", content].join("\n");
}

/**
 * Format a frontmatter object as YAML
 */
function formatFrontmatter(data: Record<string, string>): string {
  const lines = Object.entries(data).map(([key, value]) => `${key}: ${value}`);
  return ["---", ...lines, "---"].join("\n");
}
