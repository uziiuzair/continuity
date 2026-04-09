"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isTauriContext } from "@/lib/db";
import { initializeSchema } from "@/lib/db-service";
import { ensureMemorySchema } from "@/lib/db/memory-db";
import { runMcpAutoSetup } from "@/lib/mcp-auto-setup";

interface DatabaseContextType {
  isReady: boolean;
  error: string | null;
  mcpAutoConfigured: boolean;
  dismissMcpNotice: () => void;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
  mcpAutoConfigured: false,
  dismissMcpNotice: () => {},
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpAutoConfigured, setMcpAutoConfigured] = useState(false);

  const dismissMcpNotice = () => setMcpAutoConfigured(false);

  useEffect(() => {
    async function init() {
      if (!isTauriContext()) {
        setIsReady(true);
        return;
      }

      try {
        await initializeSchema();
        // Bootstrap memory.db schema so in-app AI tools and MCP server share one DB
        await ensureMemorySchema();
        setIsReady(true);

        // Run MCP auto-setup after DB is ready
        const result = await runMcpAutoSetup();
        if (result.configured) {
          setMcpAutoConfigured(true);
        }
      } catch (err) {
        console.error("Failed to initialize database:", err);
        setError(err instanceof Error ? err.message : "Database init failed");
        setIsReady(true);
      }
    }

    init();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{ isReady, error, mcpAutoConfigured, dismissMcpNotice }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
