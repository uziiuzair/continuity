"use client";

/**
 * DatabaseTable Component
 *
 * Renders the database using react-datasheet-grid for Excel-like editing experience.
 */

import { useMemo, useCallback } from "react";
import { DataSheetGrid } from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { useDatabase } from "./DatabaseContext";
import {
  toDSGData,
  fromDSGData,
  buildDSGColumns,
  DSGRow,
  ROW_ID_KEY,
  ROW_ORDER_KEY,
  generateRowId,
} from "@/lib/canvas/database/dsg-adapter";

export function DatabaseTable() {
  const { data, setRows, addSelectOption } = useDatabase();

  // Convert database data to DSG format
  const dsgData = useMemo(() => toDSGData(data), [data]);

  // Column context for select columns
  const columnContext = useMemo(
    () => ({
      addSelectOption: (columnId: string, value: string): string => {
        return addSelectOption(columnId, { value, color: "blue" });
      },
      getSelectOptions: (columnId: string) => {
        const column = data.columns.find((c) => c.id === columnId);
        return column?.options || [];
      },
    }),
    [addSelectOption, data.columns]
  );

  // Build DSG columns from database columns
  const columns = useMemo(
    () => buildDSGColumns(data.columns, columnContext),
    [data.columns, columnContext]
  );

  // Handle all DSG changes - convert entire dataset and update at once
  const handleChange = useCallback(
    (newData: DSGRow[]) => {
      // Convert DSG data back to our row format
      const newRows = fromDSGData(newData, data.columns);
      setRows(newRows);
    },
    [data.columns, setRows]
  );

  // Custom row creation - ensure we have proper IDs
  const createRow = useCallback((): DSGRow => {
    const maxOrder = data.rows.reduce((max, row) => Math.max(max, row.order), -1);
    const newRow: DSGRow = {
      [ROW_ID_KEY]: generateRowId(),
      [ROW_ORDER_KEY]: maxOrder + 1,
    };

    // Initialize with default values
    for (const column of data.columns) {
      switch (column.type) {
        case "multiselect":
          newRow[column.id] = [];
          break;
        default:
          newRow[column.id] = null;
      }
    }

    return newRow;
  }, [data.columns, data.rows]);

  // Custom duplicate row
  const duplicateRow = useCallback(
    ({ rowData }: { rowData: DSGRow }): DSGRow => {
      const maxOrder = data.rows.reduce((max, row) => Math.max(max, row.order), -1);
      return {
        ...rowData,
        [ROW_ID_KEY]: generateRowId(),
        [ROW_ORDER_KEY]: maxOrder + 1,
      };
    },
    [data.rows]
  );

  return (
    <div className="database-dsg">
      <DataSheetGrid
        value={dsgData}
        onChange={handleChange}
        columns={columns}
        createRow={createRow}
        duplicateRow={duplicateRow}
        lockRows={false}
        autoAddRow
        disableExpandSelection={false}
      />
    </div>
  );
}
