/**
 * First-launch auto-setup for MCP Memory Server.
 *
 * On first launch, writes the continuity-memory MCP config to:
 *   ~/.claude/.mcp.json  (Claude Code global config)
 *
 * Merges with existing config — never overwrites other MCP servers.
 * Tracks completion in the settings table so it only runs once.
 */

import { getSetting, setSetting } from "./db/settings";
import { isTauriContext } from "./db";

const SETUP_KEY = "mcp_auto_configured";

const MCP_CONFIG_ENTRY = {
  command: "npx",
  args: ["continuity-memory"],
};

interface McpConfig {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function runMcpAutoSetup(): Promise<{
  configured: boolean;
  alreadyDone: boolean;
  error?: string;
}> {
  if (!isTauriContext()) {
    return { configured: false, alreadyDone: false, error: "Not in Tauri context" };
  }

  // Check if already configured
  const done = await getSetting(SETUP_KEY);
  if (done === "true") {
    return { configured: false, alreadyDone: true };
  }

  try {
    const { exists, readTextFile, writeTextFile, mkdir } = await import(
      "@tauri-apps/plugin-fs"
    );
    const { homeDir, join } = await import("@tauri-apps/api/path");

    const home = await homeDir();
    const claudeDir = await join(home, ".claude");
    const mcpJsonPath = await join(claudeDir, ".mcp.json");

    // Ensure ~/.claude/ exists
    const dirExists = await exists(claudeDir);
    if (!dirExists) {
      await mkdir(claudeDir, { recursive: true });
    }

    // Read existing config or start fresh
    let config: McpConfig = {};
    const fileExists = await exists(mcpJsonPath);
    if (fileExists) {
      try {
        const content = await readTextFile(mcpJsonPath);
        config = JSON.parse(content);
      } catch {
        // Malformed JSON — start fresh but keep a backup mental note
        config = {};
      }
    }

    // Merge — don't overwrite existing servers
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Only add if not already present
    if (!config.mcpServers.continuity) {
      config.mcpServers.continuity = MCP_CONFIG_ENTRY;

      // Write back
      await writeTextFile(mcpJsonPath, JSON.stringify(config, null, 2) + "\n");
    }

    // Mark as done
    await setSetting(SETUP_KEY, "true");

    return { configured: true, alreadyDone: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mcp-auto-setup] Failed:", message);

    // Still mark as done so we don't retry on every launch
    try {
      await setSetting(SETUP_KEY, "true");
    } catch {
      // Settings write failed too — will retry next launch
    }

    return { configured: false, alreadyDone: false, error: message };
  }
}
