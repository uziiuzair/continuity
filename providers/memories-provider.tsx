"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { isTauriContext } from "@/lib/db";

// Types matching the MCP server schema
export type MemoryType =
  | "decision"
  | "preference"
  | "context"
  | "constraint"
  | "pattern";
export type MemoryScope = "global" | "project";
export type RelationshipType =
  | "related"
  | "depends_on"
  | "contradicts"
  | "supersedes"
  | "implements";

export interface McpMemory {
  id: string;
  key: string;
  content: string;
  type: MemoryType;
  scope: MemoryScope;
  project_id: string | null;
  tags: string | null;
  metadata: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface McpProject {
  id: string;
  name: string;
  description: string | null;
  path: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface McpMemoryVersion {
  id: string;
  memory_id: string;
  content: string;
  version: number;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

export interface McpMemoryLink {
  id: string;
  memory_id_a: string;
  memory_id_b: string;
  relationship_type: RelationshipType;
  created_at: string;
}

interface MemoriesContextType {
  memories: McpMemory[];
  projects: McpProject[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getVersionHistory: (memoryId: string) => Promise<McpMemoryVersion[]>;
  getLinkedMemories: (
    memoryId: string
  ) => Promise<{ link: McpMemoryLink; memory: McpMemory }[]>;
}

const MemoriesContext = createContext<MemoriesContextType>({
  memories: [],
  projects: [],
  isLoading: false,
  error: null,
  refresh: async () => {},
  getVersionHistory: async () => [],
  getLinkedMemories: async () => [],
});

// Memory DB uses a separate SQLite file at ~/.continuity/memory.db
let memoryDb: import("@tauri-apps/plugin-sql").default | null = null;

async function getMemoryDb() {
  if (!memoryDb) {
    const Database = (await import("@tauri-apps/plugin-sql")).default;
    // The Tauri SQL plugin always resolves sqlite: paths relative to the app config dir
    // (~/Library/Application Support/com.ooozzy.continuity/ on macOS).
    // The MCP server writes memory.db to the same directory, so a simple relative path works.
    memoryDb = await Database.load("sqlite:memory.db");
  }
  return memoryDb;
}

export function MemoriesProvider({ children }: { children: React.ReactNode }) {
  const [memories, setMemories] = useState<McpMemory[]>([]);
  const [projects, setProjects] = useState<McpProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauriContext()) return;

    setIsLoading(true);
    setError(null);

    try {
      const db = await getMemoryDb();

      const memRows = await db.select<McpMemory[]>(
        "SELECT * FROM memories WHERE archived_at IS NULL ORDER BY updated_at DESC"
      );
      setMemories(memRows);

      const projRows = await db.select<McpProject[]>(
        "SELECT * FROM projects WHERE archived_at IS NULL ORDER BY updated_at DESC"
      );
      setProjects(projRows);
    } catch (err) {
      // DB might not exist yet if MCP server hasn't been run
      console.error("Failed to load memories:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load memory database"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getVersionHistory = useCallback(
    async (memoryId: string): Promise<McpMemoryVersion[]> => {
      if (!isTauriContext()) return [];
      try {
        const db = await getMemoryDb();
        return await db.select<McpMemoryVersion[]>(
          "SELECT * FROM memory_versions WHERE memory_id = $1 ORDER BY version DESC",
          [memoryId]
        );
      } catch {
        return [];
      }
    },
    []
  );

  const getLinkedMemories = useCallback(
    async (
      memoryId: string
    ): Promise<{ link: McpMemoryLink; memory: McpMemory }[]> => {
      if (!isTauriContext()) return [];
      try {
        const db = await getMemoryDb();

        // Get links where this memory is either side
        const links = await db.select<
          (McpMemoryLink & McpMemory & {
            link_id: string;
            link_created_at: string;
            mem_id: string;
          })[]
        >(
          `SELECT ml.id as link_id, ml.memory_id_a, ml.memory_id_b, ml.relationship_type, ml.created_at as link_created_at,
                  m.id as mem_id, m.key, m.content, m.type, m.scope, m.project_id, m.tags, m.metadata,
                  m.archived_at, m.created_at, m.updated_at, m.version
           FROM memory_links ml
           JOIN memories m ON (
             CASE WHEN ml.memory_id_a = $1 THEN ml.memory_id_b ELSE ml.memory_id_a END = m.id
           )
           WHERE (ml.memory_id_a = $1 OR ml.memory_id_b = $1)
           AND m.archived_at IS NULL`,
          [memoryId]
        );

        return links.map((row) => ({
          link: {
            id: row.link_id,
            memory_id_a: row.memory_id_a,
            memory_id_b: row.memory_id_b,
            relationship_type: row.relationship_type,
            created_at: row.link_created_at,
          },
          memory: {
            id: row.mem_id,
            key: row.key,
            content: row.content,
            type: row.type as MemoryType,
            scope: row.scope as MemoryScope,
            project_id: row.project_id,
            tags: row.tags,
            metadata: row.metadata,
            archived_at: row.archived_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            version: row.version,
          },
        }));
      } catch {
        return [];
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll for changes every 10 seconds (simple auto-refresh)
  useEffect(() => {
    if (!isTauriContext()) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <MemoriesContext.Provider
      value={{
        memories,
        projects,
        isLoading,
        error,
        refresh,
        getVersionHistory,
        getLinkedMemories,
      }}
    >
      {children}
    </MemoriesContext.Provider>
  );
}

export function useMemories() {
  return useContext(MemoriesContext);
}
