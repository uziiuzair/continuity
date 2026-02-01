/**
 * Database Block Spec for BlockNote
 *
 * Defines the custom database block type using BlockNote's createReactBlockSpec.
 * The database data is stored as a JSON string in the block props.
 */

import { createReactBlockSpec } from "@blocknote/react";
import {
  DEFAULT_DATABASE_DATA,
  parseDatabaseData,
  serializeDatabaseData,
} from "./defaults";

// Note: The actual React component is imported dynamically in the render
// to avoid circular dependencies. We'll create a wrapper that imports it.

/**
 * Database Block Specification
 *
 * Creates a custom BlockNote block for Notion-style databases.
 * Supports Table, List, and Kanban views.
 */
export const Database = createReactBlockSpec(
  {
    type: "database",
    propSchema: {
      // Store all database data as JSON string
      // BlockNote props don't support nested objects, so we serialize
      data: {
        default: serializeDatabaseData(DEFAULT_DATABASE_DATA),
      },
    },
    // No inline content - all data is in props
    content: "none",
  },
  {
    render: (props) => {
      // Dynamic import to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const DatabaseBlockWrapper =
        require("@/components/canvas/database/DatabaseBlock").default;

      const data = parseDatabaseData(props.block.props.data);

      const handleUpdate = (newData: typeof data) => {
        props.editor.updateBlock(props.block, {
          props: { data: serializeDatabaseData(newData) },
        });
      };

      return (
        <DatabaseBlockWrapper
          data={data}
          onUpdate={handleUpdate}
          isEditable={props.editor.isEditable}
        />
      );
    },
  },
);
