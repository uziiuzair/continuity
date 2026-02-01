"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isTauriContext } from "@/lib/db";
import { initializeSchema } from "@/lib/db-service";

interface DatabaseContextType {
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!isTauriContext()) {
        // Not in Tauri, skip DB init but mark as ready
        setIsReady(true);
        return;
      }

      try {
        await initializeSchema();
        setIsReady(true);
      } catch (err) {
        console.error("Failed to initialize database:", err);
        setError(err instanceof Error ? err.message : "Database init failed");
        // Still mark as ready so app can function (with degraded DB features)
        setIsReady(true);
      }
    }

    init();
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
