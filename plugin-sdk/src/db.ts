/**
 * Database API wrapper
 */

import type { RPCClient } from "./client.js";

export class DatabaseAPI {
  constructor(private client: RPCClient) {}

  /** Run a SELECT query. Returns rows. */
  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.request("db.query", { sql, params }) as { rows: T[] };
    return result.rows;
  }

  /** Run an INSERT/UPDATE/DELETE. Returns rows affected. */
  async execute(sql: string, params: unknown[] = []): Promise<number> {
    const result = await this.client.request("db.execute", { sql, params }) as { rowsAffected: number };
    return result.rowsAffected;
  }

  /** Subscribe to table changes. Events are delivered via the events system. */
  async subscribe(table: string, events: ("insert" | "update" | "delete")[] = ["insert", "update", "delete"]): Promise<void> {
    await this.client.request("db.subscribe", { table, events });
  }
}
