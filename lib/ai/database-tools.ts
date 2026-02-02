/**
 * Database Tools for AI
 *
 * Defines tools that AI can call to create and modify database blocks.
 */

import { getCanvasContent, saveCanvasContent } from "@/lib/db/canvas";
import { isTauriContext } from "@/lib/db";
import { ToolDefinition, ToolCall, ToolResult } from "./canvas-tools";
import {
  DatabaseBlockData,
  DatabaseColumnDef,
  DatabaseRowData,
  CellValue,
  DatabaseColumnType,
} from "@/lib/canvas/database/types";
import {
  createColumn,
  createRow,
  createSelectOption,
  generateId,
  serializeDatabaseData,
  parseDatabaseData,
  createDefaultDatabase,
  createTaskDatabase,
} from "@/lib/canvas/database/defaults";

// ============================================
// TOOL DEFINITIONS
// ============================================

export const DATABASE_TOOLS: ToolDefinition[] = [
  {
    name: "create_database",
    description: `Create a new database block in the canvas. Databases are spreadsheet-like tables with typed columns (text, number, select, multiselect, date, time, status). Use this when the user wants to track tasks, create a table, manage projects, etc.`,
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title for the database",
        },
        template: {
          type: "string",
          enum: ["default", "tasks"],
          description:
            "Template to use: 'default' has Name column, 'tasks' has Task, Status, Priority, and Due Date columns",
        },
        columns: {
          type: "array",
          description:
            "Custom column definitions (optional, use instead of template for custom setup)",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Column name",
              },
              type: {
                type: "string",
                enum: ["text", "number", "select", "multiselect", "date", "time", "status"],
                description: "Column type",
              },
              options: {
                type: "array",
                description: "Options for select, multiselect, or status type columns",
                items: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    color: {
                      type: "string",
                      enum: [
                        "gray",
                        "red",
                        "orange",
                        "yellow",
                        "green",
                        "blue",
                        "purple",
                        "pink",
                      ],
                    },
                  },
                  required: ["value"],
                },
              },
            },
            required: ["name", "type"],
          },
        },
      },
      required: ["title"],
    },
  },
  {
    name: "add_database_row",
    description:
      "Add a new row to an existing database block. You need to specify which database block to add to and the cell values.",
    parameters: {
      type: "object",
      properties: {
        databaseBlockId: {
          type: "string",
          description:
            "The ID of the database block to add the row to. Use read_canvas to find this.",
        },
        cells: {
          type: "object",
          description:
            "Cell values as { columnName: value } pairs. For select columns, use the option value text.",
        },
      },
      required: ["databaseBlockId", "cells"],
    },
  },
  {
    name: "update_database_row",
    description: "Update an existing row in a database block.",
    parameters: {
      type: "object",
      properties: {
        databaseBlockId: {
          type: "string",
          description: "The ID of the database block containing the row",
        },
        rowId: {
          type: "string",
          description: "The ID of the row to update",
        },
        cells: {
          type: "object",
          description:
            "Cell values to update as { columnName: value } pairs. For select columns, use the option value text.",
        },
      },
      required: ["databaseBlockId", "rowId", "cells"],
    },
  },
];

export const DATABASE_TOOL_NAMES = DATABASE_TOOLS.map((t) => t.name);

// ============================================
// TOOL EXECUTION
// ============================================

export async function executeDatabaseTool(
  toolCall: ToolCall,
  threadId: string
): Promise<ToolResult> {
  if (!isTauriContext()) {
    return {
      toolCallId: toolCall.id,
      result: "Error: Database operations require Tauri context",
      success: false,
    };
  }

  try {
    switch (toolCall.name) {
      case "create_database":
        return await executeCreateDatabase(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            title: string;
            template?: "default" | "tasks";
            columns?: Array<{
              name: string;
              type: DatabaseColumnType;
              options?: Array<{ value: string; color?: string }>;
            }>;
          }
        );

      case "add_database_row":
        return await executeAddDatabaseRow(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            databaseBlockId: string;
            cells: Record<string, unknown>;
          }
        );

      case "update_database_row":
        return await executeUpdateDatabaseRow(
          toolCall.id,
          threadId,
          toolCall.arguments as {
            databaseBlockId: string;
            rowId: string;
            cells: Record<string, unknown>;
          }
        );

      default:
        return {
          toolCallId: toolCall.id,
          result: `Unknown database tool: ${toolCall.name}`,
          success: false,
        };
    }
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      result: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

async function executeCreateDatabase(
  toolCallId: string,
  threadId: string,
  args: {
    title: string;
    template?: "default" | "tasks";
    columns?: Array<{
      name: string;
      type: DatabaseColumnType;
      options?: Array<{ value: string; color?: string }>;
    }>;
  }
): Promise<ToolResult> {
  let databaseData: DatabaseBlockData;

  if (args.columns && args.columns.length > 0) {
    // Custom columns
    const columns: DatabaseColumnDef[] = args.columns.map((col) => {
      const column = createColumn(col.name, col.type);
      if (col.type === "select" && col.options) {
        column.options = col.options.map((opt) =>
          createSelectOption(opt.value, (opt.color as any) || "gray")
        );
      }
      return column;
    });

    databaseData = {
      columns,
      rows: [],
      title: args.title,
    };
  } else if (args.template === "tasks") {
    databaseData = createTaskDatabase();
    databaseData.title = args.title;
  } else {
    databaseData = createDefaultDatabase(args.title);
  }

  // Create the database block
  const newBlock = {
    id: `block-${generateId()}`,
    type: "database",
    props: {
      data: serializeDatabaseData(databaseData),
    },
    content: [],
    children: [],
  };

  // Append to canvas
  const content = (await getCanvasContent(threadId)) || [];
  content.push(newBlock);
  await saveCanvasContent(threadId, content);

  return {
    toolCallId,
    result: `Created database "${args.title}" with ID ${newBlock.id}. Columns: ${databaseData.columns
      .map((c) => `${c.name} (${c.type})`)
      .join(", ")}`,
    success: true,
  };
}

async function executeAddDatabaseRow(
  toolCallId: string,
  threadId: string,
  args: {
    databaseBlockId: string;
    cells: Record<string, unknown>;
  }
): Promise<ToolResult> {
  const content = await getCanvasContent(threadId);
  if (!content || content.length === 0) {
    return {
      toolCallId,
      result: "Canvas is empty, no database to add row to.",
      success: false,
    };
  }

  // Find the database block
  const blockIndex = content.findIndex(
    (block: any) => block.id === args.databaseBlockId && block.type === "database"
  );

  if (blockIndex === -1) {
    return {
      toolCallId,
      result: `Database block with ID "${args.databaseBlockId}" not found.`,
      success: false,
    };
  }

  const block = content[blockIndex] as any;
  const databaseData = parseDatabaseData(block.props.data);

  // Convert cell names to column IDs and resolve select values
  const cellsById: Record<string, CellValue> = {};

  for (const [columnName, value] of Object.entries(args.cells)) {
    const column = databaseData.columns.find(
      (c) => c.name.toLowerCase() === columnName.toLowerCase()
    );

    if (column) {
      if ((column.type === "select" || column.type === "status") && typeof value === "string" && column.options) {
        // Find or create the option
        let option = column.options.find(
          (o) => o.value.toLowerCase() === value.toLowerCase()
        );
        if (!option) {
          // Create new option
          option = createSelectOption(value, "gray");
          column.options.push(option);
        }
        cellsById[column.id] = option.id;
      } else if (column.type === "multiselect" && column.options) {
        // Handle multiselect: value can be a string or array of strings
        const values = Array.isArray(value) ? value : [String(value)];
        const optionIds: string[] = [];
        for (const v of values) {
          let option = column.options.find(
            (o) => o.value.toLowerCase() === v.toLowerCase()
          );
          if (!option) {
            option = createSelectOption(v, "gray");
            column.options.push(option);
          }
          optionIds.push(option.id);
        }
        cellsById[column.id] = optionIds;
      } else if (column.type === "number") {
        cellsById[column.id] = typeof value === "number" ? value : parseFloat(String(value));
      } else {
        cellsById[column.id] = value as CellValue;
      }
    }
  }

  // Create new row
  const maxOrder = databaseData.rows.reduce((max, row) => Math.max(max, row.order), -1);
  const newRow = createRow(maxOrder + 1, cellsById);
  databaseData.rows.push(newRow);

  // Update the block
  block.props.data = serializeDatabaseData(databaseData);
  content[blockIndex] = block;
  await saveCanvasContent(threadId, content);

  return {
    toolCallId,
    result: `Added row with ID ${newRow.id} to database.`,
    success: true,
  };
}

async function executeUpdateDatabaseRow(
  toolCallId: string,
  threadId: string,
  args: {
    databaseBlockId: string;
    rowId: string;
    cells: Record<string, unknown>;
  }
): Promise<ToolResult> {
  const content = await getCanvasContent(threadId);
  if (!content || content.length === 0) {
    return {
      toolCallId,
      result: "Canvas is empty.",
      success: false,
    };
  }

  // Find the database block
  const blockIndex = content.findIndex(
    (block: any) => block.id === args.databaseBlockId && block.type === "database"
  );

  if (blockIndex === -1) {
    return {
      toolCallId,
      result: `Database block with ID "${args.databaseBlockId}" not found.`,
      success: false,
    };
  }

  const block = content[blockIndex] as any;
  const databaseData = parseDatabaseData(block.props.data);

  // Find the row
  const rowIndex = databaseData.rows.findIndex((r) => r.id === args.rowId);
  if (rowIndex === -1) {
    return {
      toolCallId,
      result: `Row with ID "${args.rowId}" not found in database.`,
      success: false,
    };
  }

  const row = databaseData.rows[rowIndex];

  // Update cells
  for (const [columnName, value] of Object.entries(args.cells)) {
    const column = databaseData.columns.find(
      (c) => c.name.toLowerCase() === columnName.toLowerCase()
    );

    if (column) {
      if ((column.type === "select" || column.type === "status") && typeof value === "string" && column.options) {
        let option = column.options.find(
          (o) => o.value.toLowerCase() === value.toLowerCase()
        );
        if (!option) {
          option = createSelectOption(value, "gray");
          column.options.push(option);
        }
        row.cells[column.id] = option.id;
      } else if (column.type === "multiselect" && column.options) {
        const values = Array.isArray(value) ? value : [String(value)];
        const optionIds: string[] = [];
        for (const v of values) {
          let option = column.options.find(
            (o) => o.value.toLowerCase() === v.toLowerCase()
          );
          if (!option) {
            option = createSelectOption(v, "gray");
            column.options.push(option);
          }
          optionIds.push(option.id);
        }
        row.cells[column.id] = optionIds;
      } else if (column.type === "number") {
        row.cells[column.id] = typeof value === "number" ? value : parseFloat(String(value));
      } else {
        row.cells[column.id] = value as CellValue;
      }
    }
  }

  databaseData.rows[rowIndex] = row;

  // Update the block
  block.props.data = serializeDatabaseData(databaseData);
  content[blockIndex] = block;
  await saveCanvasContent(threadId, content);

  return {
    toolCallId,
    result: `Updated row "${args.rowId}".`,
    success: true,
  };
}

// ============================================
// SYSTEM PROMPT
// ============================================

export const DATABASE_TOOLS_SYSTEM_PROMPT = `
You have access to database tools for creating Notion-style databases in the canvas.

## Database Tools:

1. **create_database** - Create a new database with columns. Use 'tasks' template for task tracking, or define custom columns.
2. **add_database_row** - Add a row to an existing database. Use column names (not IDs) for cells.
3. **update_database_row** - Update an existing row in a database.

## When to use databases:

- Task lists and project tracking
- Data tables with multiple columns
- Lists that need status, priority, or other properties
- Anything the user wants to track in a structured way

## Column Types:

- **text**: Free-form text
- **number**: Numeric values
- **select**: Dropdown with colored options (automatically creates options when you add rows)
- **multiselect**: Multiple selection with colored tags
- **date**: Date values (use ISO format like "2024-01-15")
- **time**: Time values (use format like "14:30")
- **status**: Special select for task status with visual styling (To Do, In Progress, Done)

## Examples:

To create a task tracker:
- Use template: "tasks" for a pre-built structure with Task, Status, Priority, Due Date
- Or define custom columns like Status (status), Priority (select), Due Date (date)

To add a task:
- First use read_canvas to get the database block ID
- Then use add_database_row with cells: { "Task": "Review PR", "Status": "In Progress", "Priority": "High" }
`.trim();
