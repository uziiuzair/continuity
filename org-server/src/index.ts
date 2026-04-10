import { loadConfig } from "./config.js";
import { openDb, initializeSchema } from "./db.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const db = openDb(config.dbPath);
  initializeSchema(db);
  // eslint-disable-next-line no-console
  console.error(
    `[continuity-org-server] database ready at ${config.dbPath}`
  );

  const app = await buildApp({
    db,
    apiKey: config.apiKey,
  });

  // Graceful shutdown — critical for SQLite WAL consistency. Without this,
  // a SIGTERM from `docker stop` could leave the DB in a state that forces
  // WAL recovery on next start. The `tini` init in the Dockerfile is what
  // ensures SIGTERM actually reaches this handler.
  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.error(`[continuity-org-server] ${signal} received, shutting down`);
    try {
      await app.close();
      db.close();
      process.exit(0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[continuity-org-server] shutdown error:", err);
      process.exit(1);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[continuity-org-server] failed to start:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[continuity-org-server] fatal:", err);
  process.exit(1);
});
