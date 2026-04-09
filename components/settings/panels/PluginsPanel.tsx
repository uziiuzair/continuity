"use client";

/**
 * Plugins Settings Panel
 *
 * Install, configure, enable/disable, and uninstall plugins.
 * Settings for each plugin are auto-generated from the manifest's `settings` array.
 */

import { useState } from "react";
import { usePlugins } from "@/providers/plugin-provider";
import type { PluginInfo, PluginStatus } from "@/types/plugin";

// ============================================
// STATUS BADGE
// ============================================

function PluginStatusBadge({ status }: { status: PluginStatus }) {
  const config: Record<PluginStatus, { color: string; pulse: boolean; label: string }> = {
    installed: { color: "bg-neutral-400", pulse: false, label: "Installed" },
    disabled: { color: "bg-neutral-400", pulse: false, label: "Disabled" },
    starting: { color: "bg-amber-500", pulse: true, label: "Starting" },
    running: { color: "bg-green-500", pulse: false, label: "Running" },
    error: { color: "bg-red-500", pulse: false, label: "Error" },
    stopping: { color: "bg-amber-500", pulse: true, label: "Stopping" },
  };

  const { color, pulse, label } = config[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary)">
      <span className={`size-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

// ============================================
// TOGGLE SWITCH
// ============================================

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-black" : "bg-neutral-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ============================================
// PLUGIN CARD
// ============================================

function PluginCard({
  plugin,
  onToggle,
  onUninstall,
  onConfigure,
}: {
  plugin: PluginInfo;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
  onConfigure: () => void;
}) {
  return (
    <div className="border border-(--border-color) rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-(--text-primary)">{plugin.name}</h3>
            <span className="text-xs text-(--text-secondary)">v{plugin.version}</span>
            <PluginStatusBadge status={plugin.status} />
          </div>
          <p className="text-xs text-(--text-secondary) mt-1">{plugin.description}</p>
          <p className="text-xs text-(--text-secondary)/60 mt-1">by {plugin.author}</p>
        </div>
        <div className="flex items-center gap-3 ml-3">
          <Toggle checked={plugin.enabled} onChange={onToggle} />
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mt-3">
        {plugin.manifest.capabilities.map((cap) => (
          <span
            key={cap}
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/5 text-(--text-secondary)"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Error display */}
      {plugin.error && (
        <div className="mt-2 px-2 py-1.5 rounded bg-red-50 text-red-600 text-xs">
          {plugin.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-(--border-color)/50">
        {plugin.manifest.settings && plugin.manifest.settings.length > 0 && (
          <button
            onClick={onConfigure}
            className="text-xs text-(--text-secondary) hover:text-(--text-primary) transition-colors"
          >
            Configure
          </button>
        )}
        <button
          onClick={onUninstall}
          className="text-xs text-red-500 hover:text-red-600 transition-colors ml-auto"
        >
          Uninstall
        </button>
      </div>
    </div>
  );
}

// ============================================
// INSTALL FORM
// ============================================

function InstallForm({ onInstall }: { onInstall: (source: string, path: string) => Promise<unknown> }) {
  const [path, setPath] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    if (!path.trim()) return;
    setIsInstalling(true);
    setError(null);

    try {
      await onInstall(`local:${path}`, path);
      setPath("");
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : JSON.stringify(err);
      setError(msg || "Installation failed");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, title: "Select Plugin Directory" });
      if (selected) {
        setPath(selected as string);
      }
    } catch {
      // Dialog not available
    }
  };

  return (
    <div className="border border-dashed border-(--border-color) rounded-lg p-4">
      <h3 className="text-sm font-medium text-(--text-primary) mb-2">Install Plugin</h3>
      <p className="text-xs text-(--text-secondary) mb-3">
        Point to a local directory containing a <code className="px-1 py-0.5 bg-black/5 rounded text-[11px]">continuity-plugin.json</code> manifest.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/path/to/plugin"
          className="flex-1 px-3 py-1.5 text-sm border border-(--border-color) rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-black/20"
        />
        <button
          onClick={handleBrowse}
          className="px-3 py-1.5 text-sm border border-(--border-color) rounded-md hover:bg-black/5 transition-colors"
        >
          Browse
        </button>
        <button
          onClick={handleInstall}
          disabled={isInstalling || !path.trim()}
          className="px-4 py-1.5 text-sm bg-black text-white rounded-md hover:bg-black/80 transition-colors disabled:opacity-40"
        >
          {isInstalling ? "Installing..." : "Install"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}

// ============================================
// PLUGIN SETTINGS FORM
// ============================================

function PluginSettingsForm({
  plugin,
  onSave,
  onClose,
}: {
  plugin: PluginInfo;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(plugin.settings);
  const [isSaving, setIsSaving] = useState(false);

  const defs = plugin.manifest.settings || [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      console.error("Failed to save plugin settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-(--border-color) rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-(--text-primary)">
          {plugin.name} Settings
        </h3>
        <button onClick={onClose} className="text-xs text-(--text-secondary) hover:text-(--text-primary)">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        {defs.map((def) => (
          <div key={def.key}>
            <label className="block text-xs font-medium text-(--text-secondary) mb-1">
              {def.label}
              {def.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {def.description && (
              <p className="text-[11px] text-(--text-secondary)/60 mb-1">{def.description}</p>
            )}
            <input
              type={def.type === "secret" ? "password" : def.type === "number" ? "number" : "text"}
              value={String(values[def.key] ?? def.default ?? "")}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [def.key]: def.type === "number" ? Number(e.target.value) : e.target.value,
                }))
              }
              placeholder={def.placeholder}
              className="w-full px-3 py-1.5 text-sm border border-(--border-color) rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-black/20"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 text-sm bg-black text-white rounded-md hover:bg-black/80 transition-colors disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PANEL
// ============================================

export default function PluginsPanel() {
  const {
    plugins,
    hostStatus,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    updatePluginSettings,
    restartHost,
  } = usePlugins();

  const [isRestarting, setIsRestarting] = useState(false);

  const [configuringId, setConfiguringId] = useState<string | null>(null);

  const handleToggle = async (plugin: PluginInfo, enabled: boolean) => {
    if (enabled) {
      await enablePlugin(plugin.id);
    } else {
      await disablePlugin(plugin.id);
    }
  };

  const configuringPlugin = configuringId
    ? plugins.find((p) => p.id === configuringId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-medium text-(--text-primary)">Plugins</h3>
        <p className="text-sm text-(--text-secondary) mt-1">
          Extend Continuity with standalone plugins. Each plugin runs as its own process.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-(--text-secondary)">Plugin Host:</span>
          <span className={`inline-flex items-center gap-1.5 text-xs ${
            hostStatus === "running" ? "text-green-600" : "text-(--text-secondary)"
          }`}>
            <span className={`size-2 rounded-full ${
              hostStatus === "running" ? "bg-green-500" :
              hostStatus === "starting" ? "bg-amber-500 animate-pulse" :
              "bg-neutral-400"
            }`} />
            {hostStatus}
          </span>
          <button
            onClick={async () => {
              setIsRestarting(true);
              try { await restartHost(); } catch (err) { console.error(err); }
              finally { setIsRestarting(false); }
            }}
            disabled={isRestarting || hostStatus === "starting"}
            className="text-xs px-2 py-0.5 rounded border border-(--border-color) hover:bg-black/5 transition-colors disabled:opacity-40"
          >
            {isRestarting ? "Restarting..." : "Restart"}
          </button>
        </div>
      </div>

      {/* Install form */}
      <InstallForm onInstall={installPlugin} />

      {/* Configure form */}
      {configuringPlugin && (
        <PluginSettingsForm
          plugin={configuringPlugin}
          onSave={(settings) => updatePluginSettings(configuringPlugin.id, settings)}
          onClose={() => setConfiguringId(null)}
        />
      )}

      {/* Installed plugins */}
      {plugins.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-(--text-primary)">
            Installed ({plugins.length})
          </h4>
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggle={(enabled) => handleToggle(plugin, enabled)}
              onUninstall={() => uninstallPlugin(plugin.id)}
              onConfigure={() => setConfiguringId(plugin.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-(--text-secondary)">No plugins installed</p>
          <p className="text-xs text-(--text-secondary)/60 mt-1">
            Install a plugin from a local directory or GitHub repository
          </p>
        </div>
      )}
    </div>
  );
}
