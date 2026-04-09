/**
 * Settings API wrapper
 *
 * Read and write plugin-scoped configuration.
 */
export class SettingsAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Get a single setting value */
    async get(key) {
        const result = await this.client.request("settings.get", { key });
        return result.value;
    }
    /** Set a setting value */
    async set(key, value) {
        await this.client.request("settings.set", { key, value });
    }
    /** Get all settings as a key-value object */
    async getAll() {
        const result = await this.client.request("settings.getAll");
        return result.settings;
    }
}
//# sourceMappingURL=settings.js.map