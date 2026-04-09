/**
 * Events API wrapper
 *
 * Subscribe to real-time app events like memory changes, chat messages, etc.
 */
import type { RPCClient } from "./client.js";
type EventHandler = (data: Record<string, unknown>) => void | Promise<void>;
export declare class EventsAPI {
    private client;
    private handlers;
    constructor(client: RPCClient);
    /** Subscribe to an event and register a handler */
    on(event: string, handler: EventHandler): Promise<void>;
    /** Unsubscribe a specific handler */
    off(event: string, handler: EventHandler): void;
    /** Unsubscribe from an event entirely */
    unsubscribe(event: string): Promise<void>;
}
export {};
//# sourceMappingURL=events.d.ts.map