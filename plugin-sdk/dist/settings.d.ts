/**
 * Settings API wrapper
 *
 * Read and write plugin-scoped configuration.
 */
import type { RPCClient } from "./client.js";
export declare class SettingsAPI {
    private client;
    constructor(client: RPCClient);
    /** Get a single setting value */
    get<T = unknown>(key: string): Promise<T | null>;
    /** Set a setting value */
    set(key: string, value: unknown): Promise<void>;
    /** Get all settings as a key-value object */
    getAll(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=settings.d.ts.map