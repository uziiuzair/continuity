import { getDb, isTauriContext } from "./db";

export interface TestItem {
  id: number;
  content: string;
  created_at: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export async function initializeSchema(): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();

  // Test items table (existing)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS test_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Threads table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )
  `);

  // Messages table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT
    )
  `);

  // Settings table (for API keys)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index for faster message queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)
  `);

  // Add canvas_content column to threads if not exists
  const threadColumns = await db.select<{ name: string }[]>(
    "PRAGMA table_info(threads)"
  );
  const hasCanvasColumn = threadColumns.some(
    (col) => col.name === "canvas_content"
  );
  if (!hasCanvasColumn) {
    await db.execute("ALTER TABLE threads ADD COLUMN canvas_content TEXT");
  }

  // Add work_state column to threads if not exists
  const hasWorkStateColumn = threadColumns.some(
    (col) => col.name === "work_state"
  );
  if (!hasWorkStateColumn) {
    await db.execute("ALTER TABLE threads ADD COLUMN work_state TEXT");
  }

  // Memories table for persistent key-value storage
  await db.execute(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      scope TEXT DEFAULT 'global',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(key, scope)
    )
  `);

  // Artifacts table for tasks, notes, decisions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      type TEXT NOT NULL CHECK (type IN ('task', 'note', 'decision')),
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
      priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      source_message_id TEXT
    )
  `);

  // Create index for faster artifact queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_thread_id ON artifacts(thread_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(scope)
  `);

  // Databases table - metadata for each database instance
  await db.execute(`
    CREATE TABLE IF NOT EXISTS databases (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      title TEXT NOT NULL DEFAULT 'Untitled',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Database columns table - column definitions (schema)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS database_columns (
      id TEXT PRIMARY KEY,
      database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'multiselect', 'date', 'time', 'status')),
      width INTEGER DEFAULT 150,
      config TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Database rows table - actual data records
  await db.execute(`
    CREATE TABLE IF NOT EXISTS database_rows (
      id TEXT PRIMARY KEY,
      database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
      "values" TEXT NOT NULL DEFAULT '{}',
      row_type TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create indexes for faster database queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_databases_thread_id ON databases(thread_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_database_columns_database_id ON database_columns(database_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_database_rows_database_id ON database_rows(database_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_database_rows_row_type ON database_rows(row_type)
  `);

  // Journal entries table - daily notes
  await db.execute(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Index for date lookups
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date)
  `);

  // Projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      custom_prompt TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at)
  `);

  // Add project_id column to threads if not exists
  const hasProjectIdColumn = threadColumns.some(
    (col) => col.name === "project_id"
  );
  if (!hasProjectIdColumn) {
    await db.execute("ALTER TABLE threads ADD COLUMN project_id TEXT REFERENCES projects(id)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_threads_project_id ON threads(project_id)");
  }

  // Journal links table - bi-directional linking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS journal_links (
      id TEXT PRIMARY KEY,
      journal_date TEXT NOT NULL,
      linked_type TEXT NOT NULL,
      linked_id TEXT NOT NULL,
      link_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (journal_date) REFERENCES journal_entries(date)
    )
  `);

  // Indexes for journal links
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_journal_links_date ON journal_links(journal_date)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_journal_links_entity ON journal_links(linked_type, linked_id)
  `);

  // Migration: Update database_columns type constraint for new column types
  // SQLite doesn't support ALTER CONSTRAINT, so we need to recreate the table
  try {
    // Check if migration is needed by looking at the current constraint
    const columnsSchema = await db.select<{ sql: string }[]>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='database_columns'"
    );

    if (columnsSchema.length > 0 && columnsSchema[0].sql) {
      const currentSql = columnsSchema[0].sql;
      // Check if old constraint exists (has 'checkbox' but not 'multiselect')
      if (currentSql.includes("'checkbox'") && !currentSql.includes("'multiselect'")) {
        console.log("Migrating database_columns table to new column types...");

        // Create new table with updated constraint
        await db.execute(`
          CREATE TABLE IF NOT EXISTS database_columns_new (
            id TEXT PRIMARY KEY,
            database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'multiselect', 'date', 'time', 'status')),
            width INTEGER DEFAULT 150,
            config TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);

        // Copy data, converting 'checkbox' to 'status'
        await db.execute(`
          INSERT INTO database_columns_new (id, database_id, name, type, width, config, sort_order, created_at, updated_at)
          SELECT id, database_id, name,
            CASE WHEN type = 'checkbox' THEN 'status' ELSE type END,
            width, config, sort_order, created_at, updated_at
          FROM database_columns
        `);

        // Drop old table
        await db.execute("DROP TABLE database_columns");

        // Rename new table
        await db.execute("ALTER TABLE database_columns_new RENAME TO database_columns");

        // Recreate index
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_database_columns_database_id ON database_columns(database_id)
        `);

        console.log("Migration complete: database_columns table updated");
      }
    }
  } catch (migrationError) {
    console.error("Migration error (non-fatal):", migrationError);
    // Migration failed but this shouldn't block app startup
  }
}

export async function createItem(content: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("INSERT INTO test_items (content) VALUES ($1)", [content]);
}

export async function getAllItems(): Promise<TestItem[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const result = await db.select<TestItem[]>(
    "SELECT id, content, created_at FROM test_items ORDER BY created_at DESC",
  );
  return result;
}

export async function deleteItem(id: number): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM test_items WHERE id = $1", [id]);
}

// Database introspection functions

export type DbSource = "app" | "memory";

async function getDbForSource(source: DbSource) {
  if (source === "memory") {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    return Database.load("sqlite:memory.db");
  }
  return getDb();
}

export async function listTables(source: DbSource = "app"): Promise<string[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDbForSource(source);
  const result = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return result.map((row) => row.name);
}

export async function getTableSchema(tableName: string, source: DbSource = "app"): Promise<ColumnInfo[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const db = await getDbForSource(source);
  const result = await db.select<ColumnInfo[]>(
    `PRAGMA table_info(${tableName})`,
  );
  return result;
}

export async function getTableRows(
  tableName: string,
  limit: number = 100,
  source: DbSource = "app",
): Promise<Record<string, unknown>[]> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const db = await getDbForSource(source);
  const result = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM ${tableName} LIMIT ${Math.min(limit, 1000)}`,
  );
  return result;
}

export async function getTableRowCount(tableName: string, source: DbSource = "app"): Promise<number> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const db = await getDbForSource(source);
  const result = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM ${tableName}`,
  );
  return result[0]?.count ?? 0;
}
