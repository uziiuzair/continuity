import { z } from "zod";

/**
 * Env-var parsing with zod.
 *
 * CONTINUITY_ORG_API_KEY is required — the server refuses to start without
 * it. There is intentionally no "dev mode" that skips auth; preventing
 * accidentally-unauthenticated deployments is worth the small friction.
 */
const ConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(8787),
  dbPath: z.string().min(1).default("./continuity-org.db"),
  apiKey: z.string().min(1, {
    message:
      "CONTINUITY_ORG_API_KEY is required. Set it in your environment or .env file.",
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse({
    port: process.env.CONTINUITY_ORG_PORT,
    dbPath: process.env.CONTINUITY_ORG_DB_PATH,
    apiKey: process.env.CONTINUITY_ORG_API_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(
      `[continuity-org-server] Invalid configuration:\n${issues}\n`
    );
    process.exit(1);
  }

  return parsed.data;
}
