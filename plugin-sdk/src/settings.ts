/**
 * Settings API wrapper
 *
 * Read and write plugin-scoped configuration.
 */

import type { RPCClient } from "./client.js";

export class SettingsAPI {
  constructor(private client: RPCClient) {}

  /** Get a single setting value */
  async get<T = unknown>(key: string): Promise<T | null> {
    const result = await this.client.request("settings.get", { key }) as { value: T | null };
    return result.value;
  }

  /** Set a setting value */
  async set(key: string, value: unknown): Promise<void> {
    await this.client.request("settings.set", { key, value });
  }

  /** Get all settings as a key-value object */
  async getAll(): Promise<Record<string, unknown>> {
    const result = await this.client.request("settings.getAll") as { settings: Record<string, unknown> };
    return result.settings;
  }
}
