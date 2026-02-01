/**
 * Custom BlockNote Schema
 *
 * Extends the default BlockNote schema with custom blocks like Database.
 */

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { Database } from "./database";

/**
 * Custom schema with database block support
 */
export const customSchema = BlockNoteSchema.create({
  blockSpecs: {
    // Include all default blocks
    ...defaultBlockSpecs,
    // Add custom database block
    database: Database(),
  },
});

// Export the schema type for TypeScript inference
export type CustomSchema = typeof customSchema;
