/**
 * Settings RPC Handlers
 *
 * Handles settings.get, settings.set, settings.getAll
 * Manages per-plugin configuration stored in the plugins table.
 */

import { getAppDb } from "../db.js";
import type { RPCHandler } from "../types.js";

function getPluginSettings(pluginId: string): Record<string, unknown> {
  const db = getAppDb();
  const row = db.prepare("SELECT settings_json FROM plugins WHERE id = ?").get(pluginId) as
    | { settings_json: string }
    | undefined;

  if (!row) return {};
  try {
    return JSON.parse(row.settings_json);
  } catch {
    return {};
  }
}

function savePluginSettings(pluginId: string, settings: Record<string, unknown>): void {
  const db = getAppDb();
  const now = new Date().toISOString();
  db.prepare("UPDATE plugins SET settings_json = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(settings),
    now,
    pluginId
  );
}

export const settingsGet: RPCHandler = async (params, session) => {
  const key = params.key as string;
  if (typeof key !== "string") throw new Error("key must be a string");

  const settings = getPluginSettings(session.pluginId);
  return { value: settings[key] ?? null };
};

export const settingsSet: RPCHandler = async (params, session) => {
  const key = params.key as string;
  const value = params.value;
  if (typeof key !== "string") throw new Error("key must be a string");

  const settings = getPluginSettings(session.pluginId);
  settings[key] = value;
  savePluginSettings(session.pluginId, settings);

  return { success: true };
};

export const settingsGetAll: RPCHandler = async (_params, session) => {
  const settings = getPluginSettings(session.pluginId);
  return { settings };
};

export function registerSettingsHandlers(handle: (method: string, handler: RPCHandler) => void): void {
  handle("settings.get", settingsGet);
  handle("settings.set", settingsSet);
  handle("settings.getAll", settingsGetAll);
}
