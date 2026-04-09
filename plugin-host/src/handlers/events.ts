/**
 * Events RPC Handlers
 *
 * Handles events.subscribe, events.unsubscribe
 * Manages event subscriptions for real-time app events.
 */

import type { RPCHandler } from "../types.js";

const VALID_EVENTS = new Set([
  "memory:created",
  "memory:updated",
  "memory:deleted",
  "thread:created",
  "thread:switched",
  "chat:message:sent",
  "chat:message:received",
  "mcp:server:connected",
  "mcp:server:disconnected",
  "app:ready",
  "app:shutdown",
]);

export const eventsSubscribe: RPCHandler = async (params, session) => {
  const events = params.events as string[];
  if (!Array.isArray(events)) throw new Error("events must be an array");

  const subscribed: string[] = [];
  const invalid: string[] = [];

  for (const event of events) {
    if (VALID_EVENTS.has(event)) {
      session.subscribedEvents.add(event);
      subscribed.push(event);
    } else {
      invalid.push(event);
    }
  }

  if (invalid.length > 0) {
    console.warn(`[Events] Plugin ${session.pluginId} requested invalid events: ${invalid.join(", ")}`);
  }

  return { subscribed, invalid };
};

export const eventsUnsubscribe: RPCHandler = async (params, session) => {
  const events = params.events as string[];
  if (!Array.isArray(events)) throw new Error("events must be an array");

  for (const event of events) {
    session.subscribedEvents.delete(event);
  }

  return { unsubscribed: events };
};

export function registerEventsHandlers(handle: (method: string, handler: RPCHandler) => void): void {
  handle("events.subscribe", eventsSubscribe);
  handle("events.unsubscribe", eventsUnsubscribe);
}
