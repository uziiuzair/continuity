"use client";

import { useState, useEffect, useCallback } from "react";
import { isTauriContext } from "@/lib/db";
import {
  getVaultConfig,
  setVaultPath,
  setVaultEnabled,
  disconnectVault,
  VaultConfig,
} from "@/lib/vault/config";
import { scanVault } from "@/lib/vault/scanner";
import { buildVaultMemory } from "@/lib/vault/memory";
import { validateVaultPath } from "@/lib/vault/file-ops";

type ConnectionStatus = "disconnected" | "connected" | "error";

export default function VaultPanel() {
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [scanStats, setScanStats] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load current config on mount
  useEffect(() => {
    if (!isTauriContext()) {
      setIsLoading(false);
      return;
    }
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await getVaultConfig();
      setConfig(cfg);
      if (cfg?.enabled) {
        setStatus("connected");
        setPathInput(cfg.path);
        if (cfg.lastScan) {
          const scanDate = new Date(cfg.lastScan);
          setScanStats(`Last scanned: ${scanDate.toLocaleDateString()} ${scanDate.toLocaleTimeString()}`);
        }
      } else if (cfg?.path) {
        setPathInput(cfg.path);
        setStatus("disconnected");
      }
    } catch (err) {
      setError("Failed to load vault configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = useCallback(async () => {
    if (!pathInput.trim()) {
      setError("Please enter a vault path");
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      // Validate path
      const valid = await validateVaultPath(pathInput.trim());
      if (!valid) {
        setError("Path doesn't exist or isn't accessible. Make sure it points to your Obsidian vault folder.");
        setIsConnecting(false);
        return;
      }

      // Save path
      await setVaultPath(pathInput.trim());

      // Scan vault
      const result = await scanVault();
      await buildVaultMemory(pathInput.trim(), result);

      setScanStats(
        `Scanned ${result.totalFiles} files across ${result.folders.length} folders`
      );
      setStatus("connected");

      // Reload config
      const cfg = await getVaultConfig();
      setConfig(cfg);
    } catch (err) {
      setError(
        `Failed to connect: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setStatus("error");
    } finally {
      setIsConnecting(false);
    }
  }, [pathInput]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectVault();
      setConfig(null);
      setPathInput("");
      setStatus("disconnected");
      setScanStats(null);
      setError(null);
    } catch (err) {
      setError("Failed to disconnect vault");
    }
  }, []);

  const handleRescan = useCallback(async () => {
    if (!config?.path) return;

    setIsScanning(true);
    setError(null);

    try {
      const result = await scanVault();
      await buildVaultMemory(config.path, result);
      setScanStats(
        `Scanned ${result.totalFiles} files across ${result.folders.length} folders`
      );
    } catch (err) {
      setError(
        `Scan failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsScanning(false);
    }
  }, [config]);

  const handleToggleEnabled = useCallback(async (enabled: boolean) => {
    try {
      await setVaultEnabled(enabled);
      setStatus(enabled ? "connected" : "disconnected");
      const cfg = await getVaultConfig();
      setConfig(cfg);
    } catch (err) {
      setError("Failed to update vault status");
    }
  }, []);

  const handleBrowse = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Obsidian Vault Folder",
      });
      if (selected && typeof selected === "string") {
        setPathInput(selected);
      }
    } catch (err) {
      // Fallback — dialog may not be available
      setError("Folder picker unavailable. Please type the path manually.");
    }
  }, []);

  if (!isTauriContext()) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-(--text-primary) mb-2">
            Obsidian Vault
          </h3>
          <p className="text-sm text-(--text-secondary)">
            Obsidian integration requires the desktop app.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-(--border) rounded mb-2" />
          <div className="h-4 w-64 bg-(--border) rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          Obsidian Vault
        </h3>
        <p className="text-sm text-(--text-secondary)">
          Connect your Obsidian vault so the AI can read your notes for context
          and sync important content back to your vault.
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <StatusDot status={isConnecting || isScanning ? "connecting" : status} />
        <span className="text-sm text-(--text-secondary)">
          {isConnecting && "Connecting..."}
          {isScanning && !isConnecting && "Scanning vault..."}
          {!isConnecting && !isScanning && status === "connected" && "Connected"}
          {!isConnecting && !isScanning && status === "disconnected" && "Not connected"}
          {!isConnecting && !isScanning && status === "error" && "Error"}
        </span>
        {status === "connected" && config?.enabled && (
          <Toggle
            checked={true}
            onChange={(v) => handleToggleEnabled(v)}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Connected State */}
      {status === "connected" && config?.path && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-(--border) bg-(--bg-secondary)">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-(--text-primary)">
                  {config.path.split("/").pop()}
                </p>
                <p className="text-xs text-(--text-secondary) mt-0.5 font-mono">
                  {config.path}
                </p>
                {scanStats && (
                  <p className="text-xs text-(--text-secondary) mt-1">
                    {scanStats}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRescan}
              disabled={isScanning}
              className="px-4 py-2 text-sm font-medium text-(--accent) border border-(--accent)/30 rounded-md hover:bg-(--accent)/5 disabled:opacity-50 transition-colors"
            >
              {isScanning ? "Scanning..." : "Rescan Vault"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Disconnected State */}
      {(status === "disconnected" || status === "error") && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1.5">
              Vault Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="/Users/you/Documents/MyVault"
                className="flex-1 px-3 py-2 text-sm border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent font-mono"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-3 py-2 text-sm font-medium text-(--text-secondary) border border-(--border) rounded-md hover:bg-(--bg-secondary) transition-colors"
              >
                Browse
              </button>
            </div>
            <p className="mt-1.5 text-xs text-(--text-secondary)">
              Point to your Obsidian vault root folder (the one containing the .obsidian directory).
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            disabled={!pathInput.trim() || isConnecting}
            className="px-4 py-2.5 text-sm font-medium text-white bg-(--accent) rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isConnecting ? "Connecting..." : "Connect Vault"}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="border-t border-(--border) pt-4">
        <h4 className="text-sm font-medium text-(--text-primary) mb-2">
          How it works
        </h4>
        <ul className="space-y-1.5 text-xs text-(--text-secondary)">
          <li>• The AI scans your vault to build a high-level index (file names, folder structure, excerpts)</li>
          <li>• During conversation, the AI can read relevant files from your vault for context</li>
          <li>• When you create something meaningful, the AI will offer to sync it to your vault</li>
          <li>• You always approve before anything is written — no automatic syncing</li>
          <li>• New files from Continuity go to a <code className="px-1 py-0.5 bg-(--bg-primary) rounded">Continuity/</code> folder in your vault</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function StatusDot({ status }: { status: ConnectionStatus | "connecting" }) {
  const colors: Record<ConnectionStatus | "connecting", { color: string; pulse: boolean }> = {
    connected: { color: "bg-green-500", pulse: false },
    connecting: { color: "bg-amber-500", pulse: true },
    disconnected: { color: "bg-neutral-400", pulse: false },
    error: { color: "bg-red-500", pulse: false },
  };

  const { color, pulse } = colors[status];

  return (
    <span
      className={`inline-block size-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`}
    />
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-(--accent) focus:ring-offset-2 ${
        checked ? "bg-(--accent)" : "bg-(--border)"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
