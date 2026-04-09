/**
 * UI API wrapper
 *
 * Register panels, show notifications, update badges.
 */
export class UIAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Register a UI panel in the specified slot */
    async registerPanel(options) {
        await this.client.request("ui.registerPanel", { ...options });
    }
    /** Remove a registered panel */
    async removePanel(slot) {
        await this.client.request("ui.removePanel", { slot });
    }
    /** Show a toast notification in the app */
    async showNotification(options) {
        await this.client.request("ui.showNotification", { ...options });
    }
    /** Update the badge count on a sidebar item */
    async updateBadge(slot, count) {
        await this.client.request("ui.updateBadge", { slot, count });
    }
}
//# sourceMappingURL=ui.js.map