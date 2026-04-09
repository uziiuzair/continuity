/**
 * UI RPC Handlers
 *
 * Handles ui.registerPanel, ui.removePanel, ui.showNotification, ui.updateBadge
 * Allows plugins to inject UI panels and send notifications.
 */

import type { RPCHandler, PanelRegistration } from "../types.js";

const VALID_SLOTS = new Set(["sidebar", "settings", "statusbar"]);
const VALID_NOTIFICATION_TYPES = new Set(["info", "success", "warning", "error"]);

export const uiRegisterPanel: RPCHandler = async (params, session) => {
  const slot = params.slot as string;
  const label = params.label as string;
  const icon = params.icon as string;
  const url = params.url as string;

  if (!VALID_SLOTS.has(slot)) {
    throw new Error(`Invalid slot: "${slot}". Must be one of: ${[...VALID_SLOTS].join(", ")}`);
  }

  // Check capability for the specific slot
  const capability = `ui:${slot}`;
  if (!session.capabilities.includes(capability)) {
    throw new Error(`Plugin lacks ${capability} capability`);
  }

  if (typeof label !== "string") throw new Error("label must be a string");
  if (typeof icon !== "string") throw new Error("icon must be a string");
  if (typeof url !== "string") throw new Error("url must be a string");

  const panel: PanelRegistration = { slot: slot as PanelRegistration["slot"], label, icon, url };
  session.registeredPanels.set(slot, panel);

  console.log(`[UI] Plugin ${session.pluginId} registered panel: ${label} (${slot})`);
  return { success: true };
};

export const uiRemovePanel: RPCHandler = async (params, session) => {
  const slot = params.slot as string;
  if (typeof slot !== "string") throw new Error("slot must be a string");

  session.registeredPanels.delete(slot);
  console.log(`[UI] Plugin ${session.pluginId} removed panel: ${slot}`);
  return { success: true };
};

export const uiShowNotification: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("ui:notifications")) {
    throw new Error("Plugin lacks ui:notifications capability");
  }

  const title = params.title as string;
  const message = params.message as string;
  const type = params.type as string;

  if (typeof title !== "string") throw new Error("title must be a string");
  if (typeof message !== "string") throw new Error("message must be a string");
  if (!VALID_NOTIFICATION_TYPES.has(type)) {
    throw new Error(`Invalid notification type: "${type}"`);
  }

  // Notification is forwarded to the frontend via stdout protocol message
  const notification = {
    type: "notification",
    pluginId: session.pluginId,
    data: { title, message, type },
  };
  console.log(`__PLUGIN_HOST_MSG__${JSON.stringify(notification)}`);

  return { success: true };
};

export const uiUpdateBadge: RPCHandler = async (params, session) => {
  const slot = params.slot as string;
  const count = params.count as number;

  if (typeof slot !== "string") throw new Error("slot must be a string");
  if (typeof count !== "number") throw new Error("count must be a number");

  // Forward badge update to frontend via stdout protocol message
  const badge = {
    type: "badge",
    pluginId: session.pluginId,
    data: { slot, count },
  };
  console.log(`__PLUGIN_HOST_MSG__${JSON.stringify(badge)}`);

  return { success: true };
};

export function registerUIHandlers(handle: (method: string, handler: RPCHandler) => void): void {
  handle("ui.registerPanel", uiRegisterPanel);
  handle("ui.removePanel", uiRemovePanel);
  handle("ui.showNotification", uiShowNotification);
  handle("ui.updateBadge", uiUpdateBadge);
}
