"use client";

import { useState } from "react";
import { useMCP } from "@/providers/mcp-provider";
import {
  MCPServerConfig,
  MCPServerState,
  MCPTransportType,
  MCPConnectionStatus,
  MCPLogEntry,
} from "@/types/mcp";
import { isTauriContext } from "@/lib/db";

// ============================================
// HELPERS
// ============================================

function generateId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({
  status,
  error,
}: {
  status: MCPConnectionStatus;
  error?: string;
}) {
  const config: Record<
    MCPConnectionStatus,
    { color: string; pulse: boolean; label: string }
  > = {
    connected: { color: "bg-green-500", pulse: false, label: "Connected" },
    connecting: { color: "bg-amber-500", pulse: true, label: "Connecting" },
    reconnecting: {
      color: "bg-amber-500",
      pulse: true,
      label: "Reconnecting",
    },
    error: { color: "bg-red-500", pulse: false, label: "Error" },
    disconnected: { color: "bg-neutral-400", pulse: false, label: "Idle" },
  };

  const { color, pulse, label } = config[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-(--text-secondary)"
      title={status === "error" && error ? error : undefined}
    >
      <span
        className={`size-2 rounded-full ${color} ${pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}

// ============================================
// TOGGLE SWITCH
// ============================================

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

// ============================================
// KEY-VALUE EDITOR
// ============================================

function KeyValueEditor({
  label,
  pairs,
  onChange,
}: {
  label: string;
  pairs: Record<string, string>;
  onChange: (pairs: Record<string, string>) => void;
}) {
  const entries = Object.entries(pairs);

  const addPair = () => {
    onChange({ ...pairs, "": "" });
  };

  const updateKey = (oldKey: string, newKey: string, idx: number) => {
    const newPairs: Record<string, string> = {};
    entries.forEach(([k, v], i) => {
      if (i === idx) {
        newPairs[newKey] = v;
      } else {
        newPairs[k] = v;
      }
    });
    onChange(newPairs);
  };

  const updateValue = (key: string, newValue: string, idx: number) => {
    const newPairs: Record<string, string> = {};
    entries.forEach(([k, v], i) => {
      newPairs[k] = i === idx ? newValue : v;
    });
    onChange(newPairs);
  };

  const removePair = (idx: number) => {
    const newPairs: Record<string, string> = {};
    entries.forEach(([k, v], i) => {
      if (i !== idx) newPairs[k] = v;
    });
    onChange(newPairs);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-(--text-primary)">
          {label}
        </label>
        <button
          type="button"
          onClick={addPair}
          className="text-xs text-(--accent) hover:underline"
        >
          + Add
        </button>
      </div>
      {entries.length === 0 && (
        <p className="text-xs text-(--text-secondary)/50">
          No {label.toLowerCase()} configured.
        </p>
      )}
      <div className="space-y-2">
        {entries.map(([k, v], idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={k}
              onChange={(e) => updateKey(k, e.target.value, idx)}
              placeholder="Key"
              className="flex-1 px-2.5 py-1.5 text-xs border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-1 focus:ring-(--accent)"
            />
            <input
              type="text"
              value={v}
              onChange={(e) => updateValue(k, e.target.value, idx)}
              placeholder="Value"
              className="flex-1 px-2.5 py-1.5 text-xs border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-1 focus:ring-(--accent)"
            />
            <button
              type="button"
              onClick={() => removePair(idx)}
              className="text-(--text-secondary) hover:text-red-500 transition-colors"
              aria-label="Remove"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// CONNECTION LOGS
// ============================================

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const LOG_LEVEL_COLORS: Record<MCPLogEntry["level"], string> = {
  info: "text-(--text-secondary)",
  warn: "text-amber-500",
  error: "text-red-500",
};

function ConnectionLogs({ logs }: { logs: MCPLogEntry[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-(--text-secondary) mb-1.5">
        Connection Log
      </p>
      <div className="max-h-48 overflow-y-auto rounded-md border border-(--border) bg-(--bg-primary) p-2 space-y-0.5">
        {logs.map((entry, i) => (
          <div
            key={i}
            className="flex gap-2 text-[11px] font-mono leading-relaxed"
          >
            <span className="text-(--text-secondary)/50 shrink-0 select-none">
              {formatTime(entry.timestamp)}
            </span>
            <span className={LOG_LEVEL_COLORS[entry.level]}>
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SERVER FORM (Add / Edit)
// ============================================

interface ServerFormData {
  name: string;
  transportType: MCPTransportType;
  command: string;
  args: string;
  env: Record<string, string>;
  url: string;
  headers: Record<string, string>;
  enabled: boolean;
}

const EMPTY_FORM: ServerFormData = {
  name: "",
  transportType: "stdio",
  command: "",
  args: "",
  env: {},
  url: "",
  headers: {},
  enabled: true,
};

function formToConfig(form: ServerFormData, id?: string): MCPServerConfig {
  const transport =
    form.transportType === "stdio"
      ? {
          type: "stdio" as const,
          command: form.command.trim(),
          args: form.args
            .split("\n")
            .flatMap((line) => line.split(","))
            .map((s) => s.trim())
            .filter(Boolean),
          ...(Object.keys(form.env).length > 0 ? { env: form.env } : {}),
        }
      : {
          type: "http" as const,
          url: form.url.trim(),
          ...(Object.keys(form.headers).length > 0
            ? { headers: form.headers }
            : {}),
        };

  return {
    id: id ?? generateId(),
    name: form.name.trim(),
    transport,
    enabled: form.enabled,
  };
}

function configToForm(config: MCPServerConfig): ServerFormData {
  if (config.transport.type === "stdio") {
    return {
      name: config.name,
      transportType: "stdio",
      command: config.transport.command,
      args: config.transport.args.join("\n"),
      env: config.transport.env ?? {},
      url: "",
      headers: {},
      enabled: config.enabled,
    };
  }
  return {
    name: config.name,
    transportType: "http",
    command: "",
    args: "",
    env: {},
    url: config.transport.url,
    headers: config.transport.headers ?? {},
    enabled: config.enabled,
  };
}

function ServerForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: ServerFormData;
  onSubmit: (data: ServerFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ServerFormData>(initial);

  const update = <K extends keyof ServerFormData>(
    key: K,
    value: ServerFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isValid =
    form.name.trim() !== "" &&
    (form.transportType === "stdio"
      ? form.command.trim() !== ""
      : form.url.trim() !== "");

  return (
    <div className="space-y-3 p-4 rounded-lg border border-(--border) bg-(--bg-secondary)">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-(--text-primary) mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. filesystem, github"
          className="w-full px-3 py-2 text-sm border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent"
        />
      </div>

      {/* Transport Type */}
      <div>
        <label className="block text-sm font-medium text-(--text-primary) mb-1.5">
          Transport
        </label>
        <div className="flex gap-2">
          {(["stdio", "http"] as MCPTransportType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update("transportType", t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                form.transportType === t
                  ? "border-(--accent) bg-(--accent)/10 text-(--accent)"
                  : "border-(--border) text-(--text-secondary) hover:border-(--text-secondary)"
              }`}
            >
              {t === "stdio" ? "Stdio" : "HTTP"}
            </button>
          ))}
        </div>
      </div>

      {/* Stdio fields */}
      {form.transportType === "stdio" && (
        <>
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1.5">
              Command
            </label>
            <input
              type="text"
              value={form.command}
              onChange={(e) => update("command", e.target.value)}
              placeholder="e.g. npx, node, python3, uvx"
              className="w-full px-3 py-2 text-sm border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1.5">
              Arguments
            </label>
            <textarea
              value={form.args}
              onChange={(e) => update("args", e.target.value)}
              placeholder={
                "One per line, e.g.:\n-y\n@modelcontextprotocol/server-filesystem\n/tmp"
              }
              rows={3}
              className="w-full px-3 py-2 text-sm border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent resize-none font-mono"
            />
            <p className="mt-1 text-xs text-(--text-secondary)">
              One argument per line, or comma-separated.
            </p>
          </div>
          <KeyValueEditor
            label="Environment Variables"
            pairs={form.env}
            onChange={(env) => update("env", env)}
          />
        </>
      )}

      {/* HTTP fields */}
      {form.transportType === "http" && (
        <>
          <div>
            <label className="block text-sm font-medium text-(--text-primary) mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => update("url", e.target.value)}
              placeholder="e.g. http://localhost:3001/mcp"
              className="w-full px-3 py-2 text-sm border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/50 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent"
            />
          </div>
          <KeyValueEditor
            label="Headers"
            pairs={form.headers}
            onChange={(headers) => update("headers", headers)}
          />
        </>
      )}

      {/* Enabled */}
      <div className="flex items-center gap-2">
        <Toggle checked={form.enabled} onChange={(v) => update("enabled", v)} />
        <span className="text-sm text-(--text-primary)">Enable on save</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSubmit(form)}
          disabled={!isValid}
          className="px-4 py-2 text-sm font-medium text-white bg-(--accent) rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================
// SERVER CARD
// ============================================

function ServerCard({
  serverState,
  onToggle,
  onUpdate,
  onRemove,
}: {
  serverState: MCPServerState;
  onToggle: (enabled: boolean) => void;
  onUpdate: (config: MCPServerConfig) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const { config, status, error, tools, logs } = serverState;

  const transportLabel =
    config.transport.type === "stdio"
      ? `${config.transport.command} ${config.transport.args.join(" ")}`
      : config.transport.url;

  if (editing) {
    return (
      <ServerForm
        initial={configToForm(config)}
        onSubmit={(data) => {
          onUpdate(formToConfig(data, config.id));
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        submitLabel="Save Changes"
      />
    );
  }

  return (
    <div className="rounded-lg border border-(--border) bg-(--bg-secondary) overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-(--text-primary) truncate">
              {config.name}
            </span>
            <StatusBadge status={status} error={error} />
            {status === "connected" && tools.length > 0 && (
              <span className="text-xs text-(--text-secondary) bg-(--bg-primary) px-1.5 py-0.5 rounded">
                {tools.length} tool{tools.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <p className="text-xs text-(--text-secondary) truncate max-w-sm mt-0.5 font-mono">
            {transportLabel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Expand tools */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-primary) transition-colors"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-primary) transition-colors"
            aria-label="Edit server"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
              />
            </svg>
          </button>

          {/* Toggle enabled */}
          <Toggle checked={config.enabled} onChange={onToggle} />

          {/* Remove */}
          {confirmRemove ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onRemove}
                className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="px-2 py-1 text-xs text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="p-1.5 rounded-md text-(--text-secondary) hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Remove server"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-(--border) px-4 py-3">
          {/* Error message */}
          {status === "error" && error && (
            <div className="mb-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Connection logs */}
          <ConnectionLogs logs={logs} />

          <p className="text-xs font-medium text-(--text-secondary) mb-2">
            Configuration
          </p>
          <div className="space-y-1.5 text-xs font-mono text-(--text-secondary)">
            <div>
              <span className="text-(--text-primary)">Transport: </span>
              {config.transport.type}
            </div>
            {config.transport.type === "stdio" && (
              <>
                <div>
                  <span className="text-(--text-primary)">Command: </span>
                  {config.transport.command}
                </div>
                {config.transport.args.length > 0 && (
                  <div>
                    <span className="text-(--text-primary)">Args: </span>
                    {config.transport.args.map((arg, i) => (
                      <span
                        key={i}
                        className="inline-block mr-1 px-1.5 py-0.5 rounded bg-(--bg-primary) text-xs"
                      >
                        {arg}
                      </span>
                    ))}
                  </div>
                )}
                {config.transport.env &&
                  Object.keys(config.transport.env).length > 0 && (
                    <div>
                      <span className="text-(--text-primary)">Env: </span>
                      {Object.entries(config.transport.env).map(([k, v], i) => (
                        <span
                          key={i}
                          className="inline-block mr-1 px-1.5 py-0.5 rounded bg-(--bg-primary) text-xs"
                        >
                          {k}={v.length > 8 ? v.slice(0, 8) + "..." : v}
                        </span>
                      ))}
                    </div>
                  )}
              </>
            )}
            {config.transport.type === "http" && (
              <>
                <div>
                  <span className="text-(--text-primary)">URL: </span>
                  {config.transport.url}
                </div>
                {config.transport.headers &&
                  Object.keys(config.transport.headers).length > 0 && (
                    <div>
                      <span className="text-(--text-primary)">Headers: </span>
                      {Object.keys(config.transport.headers).join(", ")}
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Discovered tools */}
          {status === "connected" && tools.length > 0 && (
            <div className="mt-3 pt-3 border-t border-(--border)">
              <p className="text-xs font-medium text-(--text-secondary) mb-2">
                Discovered Tools ({tools.length})
              </p>
              <div className="space-y-1">
                {tools.map((tool) => (
                  <div
                    key={tool.qualifiedName}
                    className="px-2.5 py-1.5 rounded bg-(--bg-primary) text-xs"
                  >
                    <span className="font-medium text-(--text-primary) font-mono">
                      {tool.name}
                    </span>
                    {tool.description && (
                      <p className="text-(--text-secondary) mt-0.5 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status messages for non-connected states */}
          {status === "disconnected" && config.enabled && (
            <p className="text-xs text-(--text-secondary)/50 mt-3 italic">
              Server is enabled but not yet connected. It will connect
              automatically.
            </p>
          )}
          {status === "disconnected" && !config.enabled && (
            <p className="text-xs text-(--text-secondary)/50 mt-3 italic">
              Server is disabled. Toggle on to connect.
            </p>
          )}
          {(status === "connecting" || status === "reconnecting") && (
            <p className="text-xs text-amber-600 mt-3 italic">
              {status === "connecting"
                ? "Establishing connection..."
                : "Attempting to reconnect..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PANEL
// ============================================

export default function ConnectorsPanel() {
  const { servers, addServer, updateServer, removeServer } = useMCP();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");

  const handleAddServer = async (data: ServerFormData) => {
    const config = formToConfig(data);
    await addServer(config);
    setShowAddForm(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await updateServer(id, { enabled });
  };

  const handleUpdate = async (config: MCPServerConfig) => {
    await updateServer(config.id, config);
  };

  const handleRemove = async (id: string) => {
    await removeServer(id);
  };

  const handleImport = async () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importJson.trim());

      // Support both { mcpServers: { ... } } and raw { name: { command, args } }
      const mcpServers: Record<
        string,
        { command: string; args?: string[]; env?: Record<string, string> }
      > = parsed.mcpServers ?? parsed;

      if (typeof mcpServers !== "object" || Array.isArray(mcpServers)) {
        setImportError(
          'Invalid format. Expected { "mcpServers": { "name": { "command": "...", "args": [...] } } }',
        );
        return;
      }

      const entries = Object.entries(mcpServers);
      if (entries.length === 0) {
        setImportError("No servers found in the provided JSON.");
        return;
      }

      for (const [name, cfg] of entries) {
        const config: MCPServerConfig = {
          id: generateId(),
          name,
          transport: {
            type: "stdio" as const,
            command: cfg.command,
            args: cfg.args ?? [],
            ...(cfg.env ? { env: cfg.env } : {}),
          },
          enabled: true,
        };
        await addServer(config);
      }

      setImportJson("");
      setShowImport(false);
    } catch {
      setImportError("Invalid JSON. Please check the format and try again.");
    }
  };

  // Non-Tauri fallback
  if (!isTauriContext()) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-(--text-primary) mb-2">
            Connectors
          </h3>
          <p className="text-sm text-(--text-secondary)">
            MCP server configuration requires the desktop app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-medium text-(--text-primary) mb-2">
          Connectors
        </h3>
        <p className="text-sm text-(--text-secondary)">
          Connect MCP servers to extend AI capabilities with external tools.
        </p>
      </div>

      {/* Server List */}
      {servers.length > 0 && (
        <div className="space-y-3">
          {servers.map((serverState) => (
            <ServerCard
              key={serverState.config.id}
              serverState={serverState}
              onToggle={(enabled) =>
                handleToggle(serverState.config.id, enabled)
              }
              onUpdate={handleUpdate}
              onRemove={() => handleRemove(serverState.config.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {servers.length === 0 && !showAddForm && (
        <div className="py-8 text-center rounded-lg border border-dashed border-(--border)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="size-8 mx-auto mb-2 text-(--text-secondary)/30"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
            />
          </svg>
          <p className="text-sm text-(--text-secondary)/50">
            No MCP servers configured yet.
          </p>
        </div>
      )}

      {/* Add Server */}
      {showAddForm ? (
        <div>
          <h4 className="text-sm font-medium text-(--text-primary) mb-3">
            Add MCP Server
          </h4>
          <ServerForm
            initial={EMPTY_FORM}
            onSubmit={handleAddServer}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Add Server"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-2.5 text-sm font-medium text-(--accent) border border-dashed border-(--accent)/30 rounded-lg hover:bg-(--accent)/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add MCP Server
        </button>
      )}

      {/* Divider */}
      <div className="border-t border-(--border)" />

      {/* Quick Import */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-(--text-primary)">
            Quick Import
          </h4>
          <button
            type="button"
            onClick={() => {
              setShowImport(!showImport);
              setImportError("");
              setImportJson("");
            }}
            className="text-xs text-(--accent) hover:underline"
          >
            {showImport ? "Hide" : "Import from JSON"}
          </button>
        </div>
        <p className="text-xs text-(--text-secondary) mb-3">
          Paste your Claude Desktop config JSON to import MCP servers instantly.
        </p>

        {showImport && (
          <div className="space-y-3">
            <textarea
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setImportError("");
              }}
              placeholder={`{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    }
  }
}`}
              rows={8}
              className="w-full px-3 py-2 text-sm border border-(--border) rounded-md bg-(--bg-primary) text-(--text-primary) placeholder:text-(--text-secondary)/30 focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent resize-none font-mono"
            />
            {importError && (
              <p className="text-xs text-red-500">{importError}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-(--accent) rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Parse & Import
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImport(false);
                  setImportJson("");
                  setImportError("");
                }}
                className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
