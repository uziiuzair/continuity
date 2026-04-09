/**
 * Plugin Database Operations
 *
 * CRUD for the plugins table. Used by the frontend PluginManager
 * to persist plugin installation state.
 */

import { getDb, isTauriContext } from "../db";
import type { PluginInfo, PluginManifest } from "@/types/plugin";

interface PluginRow {
  id: string;
  name: string;
  version: string;
  description: string | null;
  manifest: string;
  enabled: number;
  install_path: string;
  source: string;
  settings_json: string;
  installed_at: string;
  updated_at: string;
}

function rowToPluginInfo(row: PluginRow): PluginInfo {
  const manifest = JSON.parse(row.manifest) as PluginManifest;
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description ?? "",
    author: manifest.author,
    manifest,
    status: row.enabled ? "disabled" : "installed", // runtime status set by PluginManager
    enabled: row.enabled === 1,
    installPath: row.install_path,
    source: row.source,
    settings: JSON.parse(row.settings_json),
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllPlugins(): Promise<PluginInfo[]> {
  if (!isTauriContext()) return [];

  const db = await getDb();
  const rows = await db.select<PluginRow[]>(
    "SELECT * FROM plugins ORDER BY installed_at DESC"
  );
  return rows.map(rowToPluginInfo);
}

export async function getPlugin(id: string): Promise<PluginInfo | null> {
  if (!isTauriContext()) return null;

  const db = await getDb();
  const rows = await db.select<PluginRow[]>(
    "SELECT * FROM plugins WHERE id = $1",
    [id]
  );
  return rows.length > 0 ? rowToPluginInfo(rows[0]) : null;
}

export async function insertPlugin(
  manifest: PluginManifest,
  installPath: string,
  source: string
): Promise<void> {
  if (!isTauriContext()) return;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO plugins (id, name, version, description, manifest, enabled, install_path, source, settings_json, installed_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 0, $6, $7, '{}', $8, $8)`,
    [
      manifest.id,
      manifest.name,
      manifest.version,
      manifest.description,
      JSON.stringify(manifest),
      installPath,
      source,
      now,
    ]
  );
}

export async function updatePluginEnabled(id: string, enabled: boolean): Promise<void> {
  if (!isTauriContext()) return;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE plugins SET enabled = $1, updated_at = $2 WHERE id = $3",
    [enabled ? 1 : 0, now, id]
  );
}

export async function updatePluginSettings(
  id: string,
  settings: Record<string, unknown>
): Promise<void> {
  if (!isTauriContext()) return;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE plugins SET settings_json = $1, updated_at = $2 WHERE id = $3",
    [JSON.stringify(settings), now, id]
  );
}

export async function updatePluginManifest(
  id: string,
  manifest: PluginManifest
): Promise<void> {
  if (!isTauriContext()) return;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    "UPDATE plugins SET name = $1, version = $2, description = $3, manifest = $4, updated_at = $5 WHERE id = $6",
    [manifest.name, manifest.version, manifest.description, JSON.stringify(manifest), now, id]
  );
}

export async function deletePlugin(id: string): Promise<void> {
  if (!isTauriContext()) return;

  const db = await getDb();
  await db.execute("DELETE FROM plugins WHERE id = $1", [id]);
}

export async function getPluginSettings(id: string): Promise<Record<string, unknown>> {
  if (!isTauriContext()) return {};

  const db = await getDb();
  const rows = await db.select<{ settings_json: string }[]>(
    "SELECT settings_json FROM plugins WHERE id = $1",
    [id]
  );

  if (rows.length === 0) return {};
  return JSON.parse(rows[0].settings_json);
}
