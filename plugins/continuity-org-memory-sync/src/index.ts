/**
 * Continuity Org Memory Sync Plugin
 *
 * Syncs local memories to a central org server so teams share knowledge.
 *
 * What it does:
 * 1. Subscribes to memory:created/updated/deleted events
 * 2. Pushes local changes to the org server
 * 3. Periodically pulls remote changes from org server
 * 4. Registers a "search_org_knowledge" tool for the AI
 * 5. Registers a sidebar panel showing sync status
 */

import { ContinuityPlugin } from "@continuity/plugin-sdk";
import { OrgAPI } from "./org-api.js";
import { SyncEngine } from "./sync-engine.js";

async function main() {
  const plugin = new ContinuityPlugin();

  plugin.declareCapabilities([
    "db:read",
    "db:write",
    "db:subscribe",
    "events:memories",
    "ui:sidebar",
    "ui:notifications",
    "chat:tools",
    "chat:prompts",
  ]);

  // Load settings
  await plugin.start();

  const settings = await plugin.settings.getAll();
  const serverUrl = settings.server_url as string;
  const apiKey = settings.api_key as string;
  const syncInterval = (settings.sync_interval as number) || 30;
  const syncScope = (settings.sync_scope as string) || "global";

  if (!serverUrl || !apiKey) {
    console.error("[OrgSync] Missing server_url or api_key in settings. Configure in Continuity Settings > Plugins.");
    await plugin.ui.showNotification({
      title: "Org Sync",
      message: "Plugin needs configuration. Go to Settings > Plugins to set your org server URL and API key.",
      type: "warning",
    });
    // Stay alive but don't sync — user needs to configure
    return;
  }

  // Initialize sync engine
  const syncEngine = new SyncEngine(plugin, serverUrl, apiKey, syncInterval, syncScope);

  // Register AI tool: search org knowledge base
  await plugin.chat.registerTool({
    name: "search_org_knowledge",
    description:
      "Search the shared organization knowledge base. Use this when the user asks about team knowledge, org decisions, shared context, or information that might have been discussed by other team members.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query — what to look for in org memories",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const query = args.query as string;
      const limit = (args.limit as number) || 5;

      try {
        const orgApi = new OrgAPI(serverUrl, apiKey);
        const results = await orgApi.search(query, limit);

        if (results.memories.length === 0) {
          return { content: "No matching memories found in the org knowledge base." };
        }

        const formatted = results.memories
          .map((m, i) => `${i + 1}. **${m.key}** (${m.type})\n   ${m.content}`)
          .join("\n\n");

        return {
          content: `Found ${results.memories.length} results in org knowledge base:\n\n${formatted}`,
        };
      } catch (err) {
        return {
          content: `Failed to search org knowledge base: ${err instanceof Error ? err.message : "Unknown error"}`,
          isError: true,
        };
      }
    },
  });

  // Inject a system prompt so the AI knows about org knowledge
  await plugin.chat.injectPrompt({
    id: "org-sync-context",
    content:
      "This user's Continuity instance is connected to their organization's shared knowledge base. " +
      "You can search it using the search_org_knowledge tool. Use it when the user asks about " +
      "team decisions, shared context, org-wide patterns, or information other team members might know.",
    position: "context",
  });

  // Register sidebar panel (the plugin would serve its own UI, but for now just register)
  // In a real implementation, the plugin would run a tiny HTTP server for the panel UI
  // await plugin.ui.registerPanel({
  //   slot: "sidebar",
  //   label: "Org Sync",
  //   icon: "cloud-upload",
  //   url: `http://localhost:${uiPort}/panel`,
  // });

  // Start syncing
  await syncEngine.start();

  // Show success notification
  await plugin.ui.showNotification({
    title: "Org Memory Sync",
    message: `Connected to ${serverUrl}. Syncing every ${syncInterval}s.`,
    type: "success",
  });

  console.log("[OrgSync] Plugin fully initialized");

  // Handle shutdown
  process.on("SIGTERM", () => {
    syncEngine.stop();
  });
}

main().catch((err) => {
  console.error("[OrgSync] Fatal error:", err);
  process.exit(1);
});
