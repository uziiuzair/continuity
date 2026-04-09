/**
 * Continuity Plugin Host
 *
 * Standalone Node.js process that manages plugin sidecars.
 * Runs a WebSocket server on localhost for plugin communication.
 *
 * Communication with the Tauri frontend happens via stdout:
 * - Regular logs go to stderr
 * - Structured messages prefixed with __PLUGIN_HOST_MSG__ go to stdout
 * - The first stdout line is the startup message with the port and auth token
 */

import { randomBytes } from "crypto";
import { PluginHostServer } from "./server.js";
import { registerDbHandlers } from "./handlers/db.js";
import { registerEventsHandlers } from "./handlers/events.js";
import { registerSettingsHandlers } from "./handlers/settings.js";
import { registerChatHandlers } from "./handlers/chat.js";
import { registerUIHandlers } from "./handlers/ui.js";
import { registerMCPHandlers } from "./handlers/mcp.js";
import { closeAll } from "./db.js";

// ─── Configuration ───────────────────────────────

// Use port from env or find a random one
const PORT = parseInt(process.env.PLUGIN_HOST_PORT || "0") || getRandomPort();
const AUTH_TOKEN = process.env.PLUGIN_HOST_TOKEN || randomBytes(32).toString("hex");

function getRandomPort(): number {
  // Pick a random port in the ephemeral range
  return 49152 + Math.floor(Math.random() * 16383);
}

// ─── Bootstrap ───────────────────────────────────

async function main() {
  // Redirect regular logs to stderr so stdout is clean for protocol messages
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => {
    const msg = args.join(" ");
    // Protocol messages go to stdout
    if (msg.startsWith("__PLUGIN_HOST_MSG__")) {
      process.stdout.write(msg + "\n");
    } else {
      process.stderr.write(`[PluginHost] ${msg}\n`);
    }
  };
  console.warn = (...args) => process.stderr.write(`[PluginHost WARN] ${args.join(" ")}\n`);
  console.error = (...args) => process.stderr.write(`[PluginHost ERROR] ${args.join(" ")}\n`);

  const server = new PluginHostServer(PORT, AUTH_TOKEN);

  // Register all RPC handlers
  registerDbHandlers((method, handler) => server.handle(method, handler));
  registerEventsHandlers((method, handler) => server.handle(method, handler));
  registerSettingsHandlers((method, handler) => server.handle(method, handler));
  registerChatHandlers((method, handler) => server.handle(method, handler));
  registerUIHandlers((method, handler) => server.handle(method, handler));
  registerMCPHandlers((method, handler) => server.handle(method, handler));

  // Route tool calls from the frontend to the target plugin
  server.handle("plugin.callTool", async (params) => {
    const pluginId = params.pluginId as string;
    const toolName = params.toolName as string;
    const args = (params.arguments as Record<string, unknown>) || {};

    if (!pluginId || !toolName) {
      throw new Error("pluginId and toolName are required");
    }

    return await server.callPluginTool(pluginId, toolName, args);
  });

  // Register plugin handshake handler
  server.handle("plugin.register", async (params, session) => {
    const capabilities = params.capabilities as string[];
    if (Array.isArray(capabilities)) {
      session.capabilities = capabilities;
    }
    console.log(`Plugin ${session.pluginId} registered with capabilities: ${session.capabilities.join(", ")}`);

    // Notify frontend of plugin state change
    const msg = {
      type: "plugin_state",
      pluginId: session.pluginId,
      data: { status: "running", capabilities: session.capabilities },
    };
    originalLog(`__PLUGIN_HOST_MSG__${JSON.stringify(msg)}`);

    return { success: true, pluginId: session.pluginId };
  });

  // Track plugin connections for frontend
  server.onConnect((pluginId) => {
    const msg = { type: "plugin_state", pluginId, data: { status: "connected" } };
    originalLog(`__PLUGIN_HOST_MSG__${JSON.stringify(msg)}`);
  });

  server.onDisconnect((pluginId) => {
    const msg = { type: "plugin_state", pluginId, data: { status: "disconnected" } };
    originalLog(`__PLUGIN_HOST_MSG__${JSON.stringify(msg)}`);
  });

  // Start the server
  try {
    await server.start();

    // Send startup message to frontend via stdout (first line)
    const startupMsg = {
      type: "startup",
      data: { port: PORT, token: AUTH_TOKEN },
    };
    originalLog(`__PLUGIN_HOST_MSG__${JSON.stringify(startupMsg)}`);
  } catch (err) {
    console.error("Failed to start Plugin Host:", err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down Plugin Host...");
    await server.stop();
    closeAll();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("SIGHUP", shutdown);

  console.log(`Plugin Host ready on port ${PORT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
