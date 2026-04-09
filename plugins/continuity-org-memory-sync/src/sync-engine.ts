/**
 * Sync Engine
 *
 * Handles bidirectional sync between local Continuity DB and the org server.
 * Push local changes, pull remote changes, handle conflicts.
 */

import type { ContinuityPlugin } from "@continuity/plugin-sdk";
import { OrgAPI, type OrgMemory } from "./org-api.js";

export class SyncEngine {
  private plugin: ContinuityPlugin;
  private orgApi: OrgAPI;
  private syncInterval: number;
  private syncScope: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSyncAt: string | null = null;
  private isSyncing = false;
  private pendingPush: OrgMemory[] = [];

  // Stats for UI
  public stats = {
    lastSyncAt: null as string | null,
    memoriesPushed: 0,
    memoriesPulled: 0,
    errors: 0,
    pendingCount: 0,
    isConnected: false,
  };

  constructor(
    plugin: ContinuityPlugin,
    serverUrl: string,
    apiKey: string,
    syncInterval: number,
    syncScope: string
  ) {
    this.plugin = plugin;
    this.orgApi = new OrgAPI(serverUrl, apiKey);
    this.syncInterval = syncInterval;
    this.syncScope = syncScope;
  }

  /** Start the sync engine — subscribe to events and begin polling */
  async start(): Promise<void> {
    // Check org server connectivity
    this.stats.isConnected = await this.orgApi.ping();
    if (!this.stats.isConnected) {
      console.warn("[Sync] Cannot reach org server — will retry on interval");
    }

    // Subscribe to local memory changes
    this.plugin.events.on("memory:created", async (data) => {
      await this.handleLocalChange("created", data);
    });

    this.plugin.events.on("memory:updated", async (data) => {
      await this.handleLocalChange("updated", data);
    });

    this.plugin.events.on("memory:deleted", async (data) => {
      await this.handleLocalChange("deleted", data);
    });

    // Do an initial pull
    await this.pull();

    // Start periodic sync
    this.timer = setInterval(() => this.syncCycle(), this.syncInterval * 1000);

    console.log(`[Sync] Engine started (interval: ${this.syncInterval}s, scope: ${this.syncScope})`);
  }

  /** Stop the sync engine */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Flush any pending pushes
    if (this.pendingPush.length > 0) {
      this.flushPending().catch((err) =>
        console.error("[Sync] Failed to flush pending on stop:", err)
      );
    }
  }

  /** Handle a local memory change — queue for push */
  private async handleLocalChange(
    _action: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const memory: OrgMemory = {
      id: data.id as string,
      key: data.key as string,
      content: data.content as string,
      type: data.type as string,
      scope: data.scope as string,
      tags: (data.tags as string) || null,
      version: (data.version as number) || 1,
      created_at: (data.created_at as string) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Filter by sync scope
    if (this.syncScope === "global" && memory.scope !== "global") {
      return;
    }

    this.pendingPush.push(memory);
    this.stats.pendingCount = this.pendingPush.length;
  }

  /** Push pending changes to the org server */
  private async flushPending(): Promise<void> {
    if (this.pendingPush.length === 0) return;

    const batch = [...this.pendingPush];
    this.pendingPush = [];
    this.stats.pendingCount = 0;

    try {
      await this.orgApi.pushMemories(batch);
      this.stats.memoriesPushed += batch.length;
      console.log(`[Sync] Pushed ${batch.length} memories to org server`);
    } catch (err) {
      // Put back in queue for retry
      this.pendingPush = [...batch, ...this.pendingPush];
      this.stats.pendingCount = this.pendingPush.length;
      this.stats.errors++;
      console.error("[Sync] Push failed:", err);
    }
  }

  /** Pull remote changes from the org server */
  private async pull(): Promise<void> {
    try {
      const remoteMemories = await this.orgApi.pullMemories(this.lastSyncAt || undefined);

      if (remoteMemories.length === 0) return;

      for (const memory of remoteMemories) {
        // Upsert into local DB
        await this.plugin.db.execute(
          `INSERT INTO memories (id, key, content, type, scope, tags, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(key, scope, COALESCE(project_id, '')) DO UPDATE SET
             content = excluded.content,
             version = excluded.version,
             updated_at = excluded.updated_at`,
          [
            memory.id,
            memory.key,
            memory.content,
            memory.type,
            memory.scope,
            memory.tags,
            memory.version,
            memory.created_at,
            memory.updated_at,
          ]
        );
      }

      this.stats.memoriesPulled += remoteMemories.length;
      console.log(`[Sync] Pulled ${remoteMemories.length} memories from org server`);
    } catch (err) {
      this.stats.errors++;
      console.error("[Sync] Pull failed:", err);
    }
  }

  /** Full sync cycle: flush pending pushes then pull */
  private async syncCycle(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // Check connectivity
      this.stats.isConnected = await this.orgApi.ping();
      if (!this.stats.isConnected) {
        console.warn("[Sync] Org server unreachable — skipping cycle");
        return;
      }

      await this.flushPending();
      await this.pull();

      this.lastSyncAt = new Date().toISOString();
      this.stats.lastSyncAt = this.lastSyncAt;
    } finally {
      this.isSyncing = false;
    }
  }
}
