/**
 * Vault Configuration
 *
 * Manages vault path storage and enabled/disabled state via the settings table.
 * The vault path points to an Obsidian vault directory on the user's filesystem.
 */

import { getSetting, setSetting, deleteSetting } from "@/lib/db/settings";
import { isTauriContext } from "@/lib/db";

const VAULT_PATH_KEY = "obsidian_vault_path";
const VAULT_ENABLED_KEY = "obsidian_vault_enabled";
const VAULT_LAST_SCAN_KEY = "obsidian_vault_last_scan";

export interface VaultConfig {
  path: string;
  enabled: boolean;
  lastScan: string | null;
}

export async function getVaultConfig(): Promise<VaultConfig | null> {
  if (!isTauriContext()) return null;

  const path = await getSetting(VAULT_PATH_KEY);
  if (!path) return null;

  const enabled = await getSetting(VAULT_ENABLED_KEY);
  const lastScan = await getSetting(VAULT_LAST_SCAN_KEY);

  return {
    path,
    enabled: enabled === "true",
    lastScan,
  };
}

export async function setVaultPath(path: string): Promise<void> {
  if (!isTauriContext()) return;
  await setSetting(VAULT_PATH_KEY, path);
  await setSetting(VAULT_ENABLED_KEY, "true");
}

export async function setVaultEnabled(enabled: boolean): Promise<void> {
  if (!isTauriContext()) return;
  await setSetting(VAULT_ENABLED_KEY, enabled ? "true" : "false");
}

export async function setVaultLastScan(timestamp: string): Promise<void> {
  if (!isTauriContext()) return;
  await setSetting(VAULT_LAST_SCAN_KEY, timestamp);
}

export async function disconnectVault(): Promise<void> {
  if (!isTauriContext()) return;
  await deleteSetting(VAULT_PATH_KEY);
  await deleteSetting(VAULT_ENABLED_KEY);
  await deleteSetting(VAULT_LAST_SCAN_KEY);
}

export async function isVaultConnected(): Promise<boolean> {
  const config = await getVaultConfig();
  return config !== null && config.enabled;
}
