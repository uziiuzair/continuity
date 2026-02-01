import { getDb, isTauriContext } from "../db";
import { AIConfig, AIProvider } from "@/types";

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export async function getSetting(key: string): Promise<string | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const rows = await db.select<SettingRow[]>(
    "SELECT key, value, updated_at FROM settings WHERE key = $1",
    [key]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0].value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execute(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = $2, updated_at = $3`,
    [key, value, now]
  );
}

export async function deleteSetting(key: string): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const db = await getDb();
  await db.execute("DELETE FROM settings WHERE key = $1", [key]);
}

const AI_CONFIG_KEYS = {
  provider: "ai_provider",
  model: "ai_model",
  apiKey: "ai_api_key",
};

export async function getAIConfig(): Promise<AIConfig | null> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  const provider = await getSetting(AI_CONFIG_KEYS.provider);
  const model = await getSetting(AI_CONFIG_KEYS.model);
  const apiKey = await getSetting(AI_CONFIG_KEYS.apiKey);

  if (!provider || !model || !apiKey) {
    return null;
  }

  return {
    provider: provider as AIProvider,
    model,
    apiKey,
  };
}

export async function setAIConfig(config: Partial<AIConfig>): Promise<void> {
  if (!isTauriContext()) {
    throw new Error("Database operations require Tauri context");
  }

  if (config.provider !== undefined) {
    await setSetting(AI_CONFIG_KEYS.provider, config.provider);
  }
  if (config.model !== undefined) {
    await setSetting(AI_CONFIG_KEYS.model, config.model);
  }
  if (config.apiKey !== undefined) {
    await setSetting(AI_CONFIG_KEYS.apiKey, config.apiKey);
  }
}
