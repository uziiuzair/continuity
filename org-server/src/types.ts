import { z } from "zod";

/**
 * Shape of a memory as sent by the continuity-org-memory-sync plugin.
 * Locked by plugins/continuity-org-memory-sync/src/org-api.ts.
 *
 * This is intentionally a SUBSET of the local memory schema in
 * server/db/schema.ts. Fields not listed here (metadata, source,
 * archived_at, project_id) stay local-only in v1.
 */
export const OrgMemorySchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  content: z.string(),
  type: z.string().min(1),
  scope: z.string().min(1),
  tags: z.string().nullable(),
  version: z.number().int().nonnegative(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

export type OrgMemory = z.infer<typeof OrgMemorySchema>;

export const BatchPushSchema = z.object({
  memories: z.array(OrgMemorySchema),
});

export type BatchPushPayload = z.infer<typeof BatchPushSchema>;
