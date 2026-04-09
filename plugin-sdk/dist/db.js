/**
 * Database API wrapper
 */
export class DatabaseAPI {
    client;
    constructor(client) {
        this.client = client;
    }
    /** Run a SELECT query. Returns rows. */
    async query(sql, params = []) {
        const result = await this.client.request("db.query", { sql, params });
        return result.rows;
    }
    /** Run an INSERT/UPDATE/DELETE. Returns rows affected. */
    async execute(sql, params = []) {
        const result = await this.client.request("db.execute", { sql, params });
        return result.rowsAffected;
    }
    /** Subscribe to table changes. Events are delivered via the events system. */
    async subscribe(table, events = ["insert", "update", "delete"]) {
        await this.client.request("db.subscribe", { table, events });
    }
}
//# sourceMappingURL=db.js.map