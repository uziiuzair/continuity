"use client";

import { useMemo } from "react";
import type { DatabaseDataSource, ChartDataConfig } from "@/types/chart";
import type { EditorBlock } from "../blocks/types";

interface UseChartDatabaseLinkResult {
  data: ChartDataConfig | null;
  error: string | null;
}

/**
 * Links a chart to a database block in the canvas.
 * Reads database block's data and maps it to ChartDataConfig.
 */
export function useChartDatabaseLink(
  source: DatabaseDataSource | undefined,
  blocks: EditorBlock[]
): UseChartDatabaseLinkResult {
  return useMemo(() => {
    if (!source?.databaseBlockId) {
      return { data: null, error: null };
    }

    // Find the database block in the canvas
    const dbBlock = blocks.find(
      (b) => b.id === source.databaseBlockId && b.type === "database"
    );

    if (!dbBlock) {
      return {
        data: null,
        error: `Database block not found: ${source.databaseBlockId}`,
      };
    }

    // Database blocks store their data in props
    // The actual database data comes from the DB service,
    // but for canvas-linked charts we can read from the block's
    // embedded data if available
    const dbData = dbBlock.props?.rows as
      | Record<string, unknown>[]
      | undefined;
    const dbColumns = dbBlock.props?.columns as
      | { id: string; name: string; type: string }[]
      | undefined;

    if (!dbData || !dbColumns || dbData.length === 0) {
      return {
        data: null,
        error: "Database has no data yet",
      };
    }

    // Find label column
    const labelCol = dbColumns.find((c) => c.id === source.labelColumnId);
    if (!labelCol) {
      return {
        data: null,
        error: `Label column not found: ${source.labelColumnId}`,
      };
    }

    const labels = dbData.map(
      (row) => String(row[source.labelColumnId] ?? "")
    );

    const series = source.valueColumnIds
      .map((colId) => {
        const col = dbColumns.find((c) => c.id === colId);
        if (!col) return null;
        return {
          name: col.name,
          data: dbData.map((row) => {
            const val = row[colId];
            return typeof val === "number"
              ? val
              : parseFloat(String(val)) || 0;
          }),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return {
      data: { labels, series },
      error: null,
    };
  }, [source, blocks]);
}
