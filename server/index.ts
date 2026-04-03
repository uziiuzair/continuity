import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeSchema } from "./db/schema.js";
import { closeDb, getDbPath } from "./db/connection.js";
import { registerMemoryTools } from "./tools/memory-tools.js";
import { registerProjectTools } from "./tools/project-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerRelationshipTools } from "./tools/relationship-tools.js";
import { registerLifecycleTools } from "./tools/lifecycle-tools.js";

const server = new McpServer({
  name: "continuity-memory",
  version: "1.0.0",
});

// Initialize database and schema
initializeSchema();
console.error(`[continuity-memory] Database initialized at ${getDbPath()}`);

// Register all tools
registerMemoryTools(server);
registerProjectTools(server);
registerSearchTools(server);
registerRelationshipTools(server);
registerLifecycleTools(server);

console.error("[continuity-memory] 12 tools registered");

// Graceful shutdown
process.on("SIGINT", () => {
  closeDb();
  process.exit(0);
});
process.on("SIGTERM", () => {
  closeDb();
  process.exit(0);
});

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[continuity-memory] Server running on stdio");
