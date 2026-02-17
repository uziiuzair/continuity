"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { MCPServerConfig, MCPServerState } from "@/types/mcp";
import { MCPManager } from "@/lib/mcp/manager";
import { isTauriContext } from "@/lib/db";

// ============================================
// CONTEXT TYPE
// ============================================

interface MCPContextType {
  servers: MCPServerState[];
  isInitialized: boolean;
  addServer: (config: MCPServerConfig) => Promise<void>;
  removeServer: (id: string) => Promise<void>;
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const MCPContext = createContext<MCPContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function MCPProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<MCPServerState[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize MCPManager and subscribe to state changes
  useEffect(() => {
    if (!isTauriContext()) {
      setIsInitialized(true);
      return;
    }

    const manager = MCPManager.getInstance();

    manager.initialize().catch((error) => {
      console.error("Failed to initialize MCPManager:", error);
    });

    // Subscribe to state changes — subscribe() returns unsubscribe fn
    const unsubscribe = manager.subscribe(() => {
      setServers(manager.getStates());
    });

    setIsInitialized(true);

    return () => {
      unsubscribe();
    };
  }, []);

  // Delegate operations to MCPManager
  const addServer = useCallback(async (config: MCPServerConfig) => {
    await MCPManager.getInstance().addServer(config);
  }, []);

  const removeServer = useCallback(async (id: string) => {
    await MCPManager.getInstance().removeServer(id);
  }, []);

  const updateServer = useCallback(
    async (id: string, updates: Partial<MCPServerConfig>) => {
      await MCPManager.getInstance().updateServer(id, updates);
    },
    []
  );

  const connectServer = useCallback(async (id: string) => {
    await MCPManager.getInstance().connectServer(id);
  }, []);

  const disconnectServer = useCallback(async (id: string) => {
    await MCPManager.getInstance().disconnectServer(id);
  }, []);

  return (
    <MCPContext.Provider
      value={{
        servers,
        isInitialized,
        addServer,
        removeServer,
        updateServer,
        connectServer,
        disconnectServer,
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useMCP(): MCPContextType {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error("useMCP must be used within an MCPProvider");
  }
  return context;
}
