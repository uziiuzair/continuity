"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listTables,
  getTableSchema,
  getTableRows,
  getTableRowCount,
  ColumnInfo,
} from "@/lib/db-service";
import { isTauriContext } from "@/lib/db";
import { cn } from "@/lib/utils";

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TableInfo {
  name: string;
  rowCount: number;
}

interface TableData {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export default function DatabaseModal({ isOpen, onClose }: DatabaseModalProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    if (!isTauriContext()) {
      setError("Database viewer requires Tauri context");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const tableNames = await listTables();
      const tablesWithCounts = await Promise.all(
        tableNames.map(async (name) => ({
          name,
          rowCount: await getTableRowCount(name),
        })),
      );
      setTables(tablesWithCounts);
      if (tablesWithCounts.length > 0 && !selectedTable) {
        setSelectedTable(tablesWithCounts[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable]);

  const loadTableData = useCallback(async (tableName: string) => {
    if (!isTauriContext()) return;

    setIsLoading(true);
    setError(null);
    try {
      const [columns, rows, rowCount] = await Promise.all([
        getTableSchema(tableName),
        getTableRows(tableName, 100),
        getTableRowCount(tableName),
      ]);
      setTableData({ columns, rows, rowCount });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load table data",
      );
      setTableData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTables();
    }
  }, [isOpen, loadTables]);

  useEffect(() => {
    if (selectedTable && isOpen) {
      loadTableData(selectedTable);
    }
  }, [selectedTable, isOpen, loadTableData]);

  const handleRefresh = () => {
    loadTables();
    if (selectedTable) {
      loadTableData(selectedTable);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          static
          open={isOpen}
          onClose={onClose}
          className="relative z-60"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal container */}
          <div className="fixed inset-0 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full max-w-300 max-h-200"
            >
              <DialogPanel className="w-full h-full bg-(--background-color) rounded-lg shadow-2xl border border-(--border-color) flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-12 flex items-center justify-between px-4 border-b border-(--border-color) bg-white/2 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-(--text-secondary)"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                        />
                      </svg>
                      <span className="text-sm font-medium text-(--text-primary)">
                        Database Browser
                      </span>
                    </div>
                    {selectedTable && (
                      <span className="text-xs text-(--text-secondary) px-2 py-0.5 bg-black/5 rounded">
                        {selectedTable}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="text-xs px-3 py-1.5 rounded border border-(--border-color) hover:bg-black/5 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg
                        className={cn("w-3 h-3", isLoading && "animate-spin")}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                      </svg>
                      Refresh
                    </button>
                    <button
                      onClick={onClose}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 transition-colors"
                      aria-label="Close database browser"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Error display */}
                {error && (
                  <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-b border-red-200">
                    {error}
                  </div>
                )}

                {/* Main content */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Tables sidebar */}
                  <div className="w-56 border-r border-(--border-color) flex flex-col shrink-0">
                    <div className="px-3 py-2 text-xs font-medium text-(--text-secondary) uppercase tracking-wider border-b border-(--border-color)">
                      Tables ({tables.length})
                    </div>
                    <div className="flex-1 overflow-y-auto py-1">
                      {tables.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-(--text-secondary)/50 text-center">
                          {isLoading ? "Loading..." : "No tables found"}
                        </div>
                      ) : (
                        tables.map((table) => (
                          <button
                            key={table.name}
                            onClick={() => setSelectedTable(table.name)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors",
                              selectedTable === table.name
                                ? "bg-black/5 text-(--text-primary)"
                                : "text-(--text-secondary) hover:bg-black/2 hover:text-(--text-primary)",
                            )}
                          >
                            <span className="truncate">{table.name}</span>
                            <span className="text-xs text-(--text-secondary)/60 ml-2">
                              {table.rowCount}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Schema and Data area */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {!selectedTable ? (
                      <div className="flex-1 flex items-center justify-center text-(--text-secondary)/50 text-sm">
                        Select a table to view its data
                      </div>
                    ) : !tableData ? (
                      <div className="flex-1 flex items-center justify-center text-(--text-secondary)/50 text-sm">
                        {isLoading ? "Loading..." : "No data available"}
                      </div>
                    ) : (
                      <>
                        {/* Schema bar */}
                        <div className="px-4 py-2 border-b border-(--border-color) bg-black/1">
                          <div className="flex items-center gap-4 overflow-x-auto">
                            {tableData.columns.map((col) => (
                              <div
                                key={col.name}
                                className="flex items-center gap-1.5 shrink-0"
                              >
                                <span className="text-xs font-medium text-(--text-primary)">
                                  {col.name}
                                </span>
                                <span className="text-[10px] text-(--text-secondary)/60 uppercase">
                                  {col.type || "any"}
                                </span>
                                {col.pk === 1 && (
                                  <span className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                                    PK
                                  </span>
                                )}
                                {col.notnull === 1 && (
                                  <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    NN
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Row count info */}
                        <div className="px-4 py-1.5 text-xs text-(--text-secondary) border-b border-(--border-color) bg-black/0.5">
                          {tableData.rowCount} row
                          {tableData.rowCount !== 1 ? "s" : ""} total
                          {tableData.rowCount > 100 && " (showing first 100)"}
                        </div>

                        {/* Data table */}
                        <div className="flex-1 overflow-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 bg-(--background-color)">
                              <tr>
                                {tableData.columns.map((col) => (
                                  <th
                                    key={col.name}
                                    className="px-4 py-2 text-left text-xs font-medium text-(--text-secondary) border-b border-(--border-color) bg-(--background-color) whitespace-nowrap"
                                  >
                                    {col.name}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border-color)/50">
                              {tableData.rows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={tableData.columns.length}
                                    className="px-4 py-8 text-center text-(--text-secondary)/50"
                                  >
                                    No data in this table
                                  </td>
                                </tr>
                              ) : (
                                tableData.rows.map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-black/2 transition-colors"
                                  >
                                    {tableData.columns.map((col) => (
                                      <td
                                        key={col.name}
                                        className="px-4 py-2 text-(--text-primary) whitespace-nowrap max-w-75 overflow-hidden text-ellipsis"
                                        title={formatCellValue(row[col.name])}
                                      >
                                        <CellValue value={row[col.name]} />
                                      </td>
                                    ))}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </DialogPanel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-(--text-secondary)/40 italic">NULL</span>;
  }
  if (value === undefined) {
    return <span className="text-(--text-secondary)/40">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
        )}
      >
        {value ? "true" : "false"}
      </span>
    );
  }
  if (typeof value === "object") {
    return (
      <span className="text-xs font-mono text-(--text-secondary)">
        {JSON.stringify(value)}
      </span>
    );
  }
  return <>{String(value)}</>;
}

function formatCellValue(value: unknown): string {
  if (value === null) return "NULL";
  if (value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
