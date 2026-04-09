/**
 * Database RPC Handlers
 *
 * Handles db.query, db.execute, db.subscribe
 * Provides API-mediated access to the app's SQLite database.
 */

import { getAppDb, getMemoryDb } from "../db.js";
import type { RPCHandler, PluginSession } from "../types.js";

// Blocked SQL keywords for safety
const DANGEROUS_PATTERNS = /^\s*(DROP|ALTER|CREATE|ATTACH|DETACH|VACUUM|REINDEX)\s/i;

function validateSql(sql: string, allowWrite: boolean): void {
  if (DANGEROUS_PATTERNS.test(sql)) {
    throw new Error("DDL statements (DROP, ALTER, CREATE, etc.) are not allowed via the plugin API");
  }
  if (!allowWrite && /^\s*(INSERT|UPDATE|DELETE|REPLACE)\s/i.test(sql)) {
    throw new Error("Write operations require db:write capability");
  }
}

function getTargetDb(params: Record<string, unknown>) {
  const target = (params.database as string) || "app";
  if (target === "memory") return getMemoryDb();
  return getAppDb();
}

export const dbQuery: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("db:read")) {
    throw new Error("Plugin lacks db:read capability");
  }

  const sql = params.sql as string;
  const sqlParams = (params.params as unknown[]) || [];

  if (typeof sql !== "string") throw new Error("sql must be a string");
  validateSql(sql, false);

  const db = getTargetDb(params);
  const rows = db.prepare(sql).all(...sqlParams);
  return { rows };
};

export const dbExecute: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("db:write")) {
    throw new Error("Plugin lacks db:write capability");
  }

  const sql = params.sql as string;
  const sqlParams = (params.params as unknown[]) || [];

  if (typeof sql !== "string") throw new Error("sql must be a string");
  validateSql(sql, true);

  const db = getTargetDb(params);
  const result = db.prepare(sql).run(...sqlParams);
  return { rowsAffected: result.changes };
};

export const dbSubscribe: RPCHandler = async (params, session) => {
  if (!session.capabilities.includes("db:subscribe")) {
    throw new Error("Plugin lacks db:subscribe capability");
  }

  const table = params.table as string;
  const events = (params.events as string[]) || ["insert", "update", "delete"];

  if (typeof table !== "string") throw new Error("table must be a string");
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    throw new Error("Invalid table name");
  }

  session.subscribedTables.set(table, new Set(events));
  return { subscribed: true, table, events };
};

export function registerDbHandlers(handle: (method: string, handler: RPCHandler) => void): void {
  handle("db.query", dbQuery);
  handle("db.execute", dbExecute);
  handle("db.subscribe", dbSubscribe);
}
