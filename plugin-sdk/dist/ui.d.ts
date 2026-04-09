/**
 * UI API wrapper
 *
 * Register panels, show notifications, update badges.
 */
import type { RPCClient } from "./client.js";
import type { PanelOptions, NotificationOptions } from "./types.js";
export declare class UIAPI {
    private client;
    constructor(client: RPCClient);
    /** Register a UI panel in the specified slot */
    registerPanel(options: PanelOptions): Promise<void>;
    /** Remove a registered panel */
    removePanel(slot: string): Promise<void>;
    /** Show a toast notification in the app */
    showNotification(options: NotificationOptions): Promise<void>;
    /** Update the badge count on a sidebar item */
    updateBadge(slot: string, count: number): Promise<void>;
}
//# sourceMappingURL=ui.d.ts.map