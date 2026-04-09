"use client";

/**
 * Plugin Provider
 *
 * React context that exposes plugin system state to the UI.
 * Initializes the PluginManager after the database is ready.
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { isTauriContext } from "@/lib/db";
import { useDatabase } from "./database-provider";
import type {
  PluginInfo,
  RegisteredPanel,
  RegisteredTool,
  RegisteredPrompt,
} from "@/types/plugin";

interface PluginContextType {
  isReady: boolean;
  hostStatus: "stopped" | "starting" | "running" | "error";
  plugins: PluginInfo[];
  panels: RegisteredPanel[];
  tools: RegisteredTool[];
  prompts: RegisteredPrompt[];
  installPlugin: (source: string, installPath: string) => Promise<PluginInfo>;
  uninstallPlugin: (id: string) => Promise<void>;
  enablePlugin: (id: string) => Promise<void>;
  disablePlugin: (id: string) => Promise<void>;
  updatePluginSettings: (id: string, settings: Record<string, unknown>) => Promise<void>;
  restartHost: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType>({
  isReady: false,
  hostStatus: "stopped",
  plugins: [],
  panels: [],
  tools: [],
  prompts: [],
  installPlugin: async () => { throw new Error("PluginProvider not ready"); },
  uninstallPlugin: async () => {},
  enablePlugin: async () => {},
  disablePlugin: async () => {},
  updatePluginSettings: async () => {},
  restartHost: async () => {},
});

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const { isReady: dbReady } = useDatabase();
  const [isReady, setIsReady] = useState(false);
  const [hostStatus, setHostStatus] = useState<PluginContextType["hostStatus"]>("stopped");
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [panels, setPanels] = useState<RegisteredPanel[]>([]);
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [prompts, setPrompts] = useState<RegisteredPrompt[]>([]);

  useEffect(() => {
    if (!dbReady || !isTauriContext()) {
      setIsReady(true);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    async function init() {
      // Dynamic import to avoid SSR issues with Tauri APIs
      const { PluginManager } = await import("@/lib/plugins/manager");
      const manager = PluginManager.getInstance();

      // Subscribe to state changes
      unsubscribe = manager.subscribe(() => {
        const state = manager.getState();
        setHostStatus(state.hostStatus);
        setPlugins([...state.plugins]);
        setPanels([...state.panels]);
        setTools([...state.tools]);
        setPrompts([...state.prompts]);
      });

      // Initialize (loads plugins from DB, starts host, auto-starts enabled plugins)
      await manager.initialize();
      setIsReady(true);
    }

    init().catch((err) => {
      console.error("[PluginProvider] Init failed:", err);
      setIsReady(true);
    });

    return () => {
      unsubscribe?.();
    };
  }, [dbReady]);

  const installPlugin = useCallback(async (source: string, installPath: string) => {
    const { PluginManager } = await import("@/lib/plugins/manager");
    return PluginManager.getInstance().installPlugin(source, installPath);
  }, []);

  const uninstallPlugin = useCallback(async (id: string) => {
    const { PluginManager } = await import("@/lib/plugins/manager");
    await PluginManager.getInstance().uninstallPlugin(id);
  }, []);

  const enablePlugin = useCallback(async (id: string) => {
    const { PluginManager } = await import("@/lib/plugins/manager");
    await PluginManager.getInstance().enablePlugin(id);
  }, []);

  const disablePlugin = useCallback(async (id: string) => {
    const { PluginManager } = await import("@/lib/plugins/manager");
    await PluginManager.getInstance().disablePlugin(id);
  }, []);

  const updatePluginSettings = useCallback(async (id: string, settings: Record<string, unknown>) => {
    const { PluginManager } = await import("@/lib/plugins/manager");
    await PluginManager.getInstance().updateSettings(id, settings);
  }, []);

  const restartHost = useCallback(async () => {
    const { PluginManager } = await import("@/lib/plugins/manager");
    await PluginManager.getInstance().restartHost();
  }, []);

  return (
    <PluginContext.Provider
      value={{
        isReady,
        hostStatus,
        plugins,
        panels,
        tools,
        prompts,
        installPlugin,
        uninstallPlugin,
        enablePlugin,
        disablePlugin,
        updatePluginSettings,
        restartHost,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
}

export function usePlugins() {
  return useContext(PluginContext);
}
