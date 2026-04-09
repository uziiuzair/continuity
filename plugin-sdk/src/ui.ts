/**
 * UI API wrapper
 *
 * Register panels, show notifications, update badges.
 */

import type { RPCClient } from "./client.js";
import type { PanelOptions, NotificationOptions } from "./types.js";

export class UIAPI {
  constructor(private client: RPCClient) {}

  /** Register a UI panel in the specified slot */
  async registerPanel(options: PanelOptions): Promise<void> {
    await this.client.request("ui.registerPanel", { ...options });
  }

  /** Remove a registered panel */
  async removePanel(slot: string): Promise<void> {
    await this.client.request("ui.removePanel", { slot });
  }

  /** Show a toast notification in the app */
  async showNotification(options: NotificationOptions): Promise<void> {
    await this.client.request("ui.showNotification", { ...options });
  }

  /** Update the badge count on a sidebar item */
  async updateBadge(slot: string, count: number): Promise<void> {
    await this.client.request("ui.updateBadge", { slot, count });
  }
}
