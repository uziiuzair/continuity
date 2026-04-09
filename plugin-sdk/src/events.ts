/**
 * Events API wrapper
 *
 * Subscribe to real-time app events like memory changes, chat messages, etc.
 */

import type { RPCClient } from "./client.js";

type EventHandler = (data: Record<string, unknown>) => void | Promise<void>;

export class EventsAPI {
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(private client: RPCClient) {
    // Wire up all event notifications from the host
    // Host sends notifications like "event:memory:created" with data
  }

  /** Subscribe to an event and register a handler */
  async on(event: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
      // Tell the host we want this event
      await this.client.request("events.subscribe", { events: [event] });
    }
    this.handlers.get(event)!.add(handler);

    // Register notification handler with the RPC client
    this.client.onNotification(`event:${event}`, (params) => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        for (const h of handlers) {
          Promise.resolve(h(params)).catch((err) => {
            console.error(`[Events] Handler error for ${event}:`, err);
          });
        }
      }
    });
  }

  /** Unsubscribe a specific handler */
  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /** Unsubscribe from an event entirely */
  async unsubscribe(event: string): Promise<void> {
    this.handlers.delete(event);
    await this.client.request("events.unsubscribe", { events: [event] });
  }
}
