#!/usr/bin/env node

// Continuity Memory — MCP server for persistent AI memory
// Usage: npx continuity-memory

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Ensure better-sqlite3 can find its native addon when run via npx
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Import and run the bundled server
await import(join(__dirname, "..", "dist", "server.mjs"));
