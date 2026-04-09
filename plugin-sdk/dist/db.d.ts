/**
 * Database API wrapper
 */
import type { RPCClient } from "./client.js";
export declare class DatabaseAPI {
    private client;
    constructor(client: RPCClient);
    /** Run a SELECT query. Returns rows. */
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
    /** Run an INSERT/UPDATE/DELETE. Returns rows affected. */
    execute(sql: string, params?: unknown[]): Promise<number>;
    /** Subscribe to table changes. Events are delivered via the events system. */
    subscribe(table: string, events?: ("insert" | "update" | "delete")[]): Promise<void>;
}
//# sourceMappingURL=db.d.ts.map