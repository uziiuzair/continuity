"use client";

import { useState, useCallback } from "react";
import type {
  ChartDataSource,
  ApiDataSource,
  DatabaseDataSource,
} from "@/types/chart";
import type { EditorBlock } from "../blocks/types";
import { cn } from "@/lib/utils";

interface DataSourceConfigProps {
  dataSource?: ChartDataSource;
  blocks: EditorBlock[];
  onChange: (source: ChartDataSource) => void;
  onClose: () => void;
}

type TabType = "static" | "database" | "api";

export default function DataSourceConfig({
  dataSource,
  blocks,
  onChange,
  onClose,
}: DataSourceConfigProps) {
  const [activeTab, setActiveTab] = useState<TabType>(
    dataSource?.type ?? "static"
  );

  // Database source state
  const databaseBlocks = blocks.filter((b) => b.type === "database");
  const [dbBlockId, setDbBlockId] = useState(
    dataSource?.type === "database" ? dataSource.databaseBlockId : ""
  );
  const [labelColId, setLabelColId] = useState(
    dataSource?.type === "database" ? dataSource.labelColumnId : ""
  );
  const [valueColIds, setValueColIds] = useState<string[]>(
    dataSource?.type === "database" ? dataSource.valueColumnIds : []
  );

  // API source state
  const [apiUrl, setApiUrl] = useState(
    dataSource?.type === "api" ? dataSource.url : ""
  );
  const [apiMethod, setApiMethod] = useState<"GET" | "POST">(
    dataSource?.type === "api" ? (dataSource.method ?? "GET") : "GET"
  );
  const [pollInterval, setPollInterval] = useState(
    dataSource?.type === "api"
      ? dataSource.pollingIntervalMs / 1000
      : 30
  );
  const [jsonPath, setJsonPath] = useState(
    dataSource?.type === "api" ? dataSource.jsonPath : ""
  );
  const [labelField, setLabelField] = useState(
    dataSource?.type === "api" ? dataSource.labelField : ""
  );
  const [valueFields, setValueFields] = useState(
    dataSource?.type === "api" ? dataSource.valueFields.join(", ") : ""
  );

  const handleApply = useCallback(() => {
    switch (activeTab) {
      case "static":
        onChange({ type: "static" });
        break;
      case "database":
        if (dbBlockId && labelColId && valueColIds.length > 0) {
          onChange({
            type: "database",
            databaseBlockId: dbBlockId,
            labelColumnId: labelColId,
            valueColumnIds: valueColIds,
          } as DatabaseDataSource);
        }
        break;
      case "api":
        if (apiUrl && labelField && valueFields) {
          onChange({
            type: "api",
            url: apiUrl,
            method: apiMethod,
            pollingIntervalMs: Math.max(pollInterval, 5) * 1000,
            jsonPath,
            labelField,
            valueFields: valueFields
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean),
          } as ApiDataSource);
        }
        break;
    }
    onClose();
  }, [
    activeTab,
    dbBlockId,
    labelColId,
    valueColIds,
    apiUrl,
    apiMethod,
    pollInterval,
    jsonPath,
    labelField,
    valueFields,
    onChange,
    onClose,
  ]);

  return (
    <div className="datasource-config">
      <div className="datasource-config-header">
        <span className="text-sm font-medium">Data Source</span>
        <button className="datasource-close-btn" onClick={onClose}>
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="datasource-tabs">
        {(["static", "database", "api"] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={cn("datasource-tab", activeTab === tab && "active")}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "static"
              ? "Static"
              : tab === "database"
                ? "Database"
                : "API"}
          </button>
        ))}
      </div>

      <div className="datasource-content">
        {activeTab === "static" && (
          <p className="text-xs text-(--text-secondary)">
            Edit data manually using the spreadsheet editor.
          </p>
        )}

        {activeTab === "database" && (
          <div className="datasource-form">
            <label className="datasource-label">
              Database Block
              <select
                className="datasource-select"
                value={dbBlockId}
                onChange={(e) => setDbBlockId(e.target.value)}
              >
                <option value="">Select a database...</option>
                {databaseBlocks.map((db) => (
                  <option key={db.id} value={db.id}>
                    {(db.props?.title as string) || `Database ${db.id.slice(-6)}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="datasource-label">
              Label Column ID
              <input
                className="datasource-input"
                value={labelColId}
                onChange={(e) => setLabelColId(e.target.value)}
                placeholder="e.g. name"
              />
            </label>
            <label className="datasource-label">
              Value Column IDs (comma-separated)
              <input
                className="datasource-input"
                value={valueColIds.join(", ")}
                onChange={(e) =>
                  setValueColIds(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="e.g. revenue, cost"
              />
            </label>
          </div>
        )}

        {activeTab === "api" && (
          <div className="datasource-form">
            <label className="datasource-label">
              URL
              <input
                className="datasource-input"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/data"
              />
            </label>
            <label className="datasource-label">
              Method
              <select
                className="datasource-select"
                value={apiMethod}
                onChange={(e) =>
                  setApiMethod(e.target.value as "GET" | "POST")
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
            <label className="datasource-label">
              Polling Interval (seconds)
              <input
                className="datasource-input"
                type="number"
                min={5}
                max={300}
                value={pollInterval}
                onChange={(e) => setPollInterval(Number(e.target.value))}
              />
            </label>
            <label className="datasource-label">
              JSON Path
              <input
                className="datasource-input"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                placeholder="data.results"
              />
            </label>
            <label className="datasource-label">
              Label Field
              <input
                className="datasource-input"
                value={labelField}
                onChange={(e) => setLabelField(e.target.value)}
                placeholder="name"
              />
            </label>
            <label className="datasource-label">
              Value Fields (comma-separated)
              <input
                className="datasource-input"
                value={valueFields}
                onChange={(e) => setValueFields(e.target.value)}
                placeholder="price, volume"
              />
            </label>
          </div>
        )}
      </div>

      <div className="datasource-actions">
        <button className="datasource-cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="datasource-apply-btn" onClick={handleApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
