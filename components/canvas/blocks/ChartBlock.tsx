"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { BlockRef } from "../Block";
import type { BlockComponentProps } from "./types";
import type {
  ChartType,
  ChartDataConfig,
  ChartDataSource,
  ApiDataSource,
  DatabaseDataSource,
} from "@/types/chart";
import ChartDisplay from "../chart/ChartDisplay";
import ChartDataEditor from "../chart/ChartDataEditor";
import ChartToolbar from "../chart/ChartToolbar";
import DataSourceConfig from "../chart/DataSourceConfig";
import ApiStatus from "../chart/ApiStatus";
import { useApiPolling } from "../hooks/useApiPolling";
import { useChartDatabaseLink } from "../hooks/useChartDatabaseLink";

interface ChartBlockProps extends BlockComponentProps {
  allBlocks?: import("./types").EditorBlock[];
}

const ChartBlock = forwardRef<BlockRef, ChartBlockProps>(
  function ChartBlock({ block, onUpdate, allBlocks = [] }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDataSourceConfig, setShowDataSourceConfig] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => containerRef.current?.focus(),
      getElement: () => containerRef.current,
    }));

    const chartType = (block.props?.chartType as ChartType) ?? "bar";
    const staticData = (block.props?.data as ChartDataConfig) ?? {
      labels: [],
      series: [],
    };
    const showLegend = (block.props?.showLegend as boolean) ?? true;
    const showGrid = (block.props?.showGrid as boolean) ?? true;
    const title = (block.props?.title as string) ?? "";
    const dataSource = block.props?.dataSource as ChartDataSource | undefined;

    // Live data hooks
    const apiSource = useMemo(
      () =>
        dataSource?.type === "api" ? (dataSource as ApiDataSource) : undefined,
      [dataSource]
    );
    const dbSource = useMemo(
      () =>
        dataSource?.type === "database"
          ? (dataSource as DatabaseDataSource)
          : undefined,
      [dataSource]
    );

    const apiResult = useApiPolling(apiSource);
    const dbResult = useChartDatabaseLink(dbSource, allBlocks);

    // Determine which data to display
    const displayData = useMemo(() => {
      if (dataSource?.type === "api" && apiResult.data) return apiResult.data;
      if (dataSource?.type === "database" && dbResult.data) return dbResult.data;
      return staticData;
    }, [dataSource, apiResult.data, dbResult.data, staticData]);

    const updateProps = useCallback(
      (updates: Record<string, unknown>) => {
        onUpdate(block.id, {
          props: { ...block.props, ...updates },
        });
      },
      [block.id, block.props, onUpdate]
    );

    const handleChartTypeChange = useCallback(
      (type: ChartType) => updateProps({ chartType: type }),
      [updateProps]
    );

    const handleDataChange = useCallback(
      (newData: ChartDataConfig) => updateProps({ data: newData }),
      [updateProps]
    );

    const handleDataSourceChange = useCallback(
      (source: ChartDataSource) => updateProps({ dataSource: source }),
      [updateProps]
    );

    const handleTitleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) =>
        updateProps({ title: e.target.value }),
      [updateProps]
    );

    return (
      <div
        ref={containerRef}
        className="chart-block"
        contentEditable={false}
        data-block-id={block.id}
        tabIndex={-1}
      >
        {/* Title */}
        <div className="chart-block-title-row">
          <input
            className="chart-block-title"
            value={title}
            onChange={handleTitleChange}
            placeholder="Chart title..."
          />
        </div>

        {/* Toolbar */}
        <ChartToolbar
          chartType={chartType}
          showLegend={showLegend}
          showGrid={showGrid}
          isEditing={isEditing}
          onChartTypeChange={handleChartTypeChange}
          onToggleLegend={() => updateProps({ showLegend: !showLegend })}
          onToggleGrid={() => updateProps({ showGrid: !showGrid })}
          onToggleEdit={() => setIsEditing((prev) => !prev)}
          onConfigureDataSource={() => setShowDataSourceConfig((p) => !p)}
        />

        {/* API Status Badge */}
        {dataSource?.type === "api" && (
          <ApiStatus
            isLoading={apiResult.isLoading}
            error={apiResult.error}
            lastUpdated={apiResult.lastUpdated}
          />
        )}

        {/* Database error */}
        {dataSource?.type === "database" && dbResult.error && (
          <div className="chart-db-error">{dbResult.error}</div>
        )}

        {/* Chart Display */}
        <div className="chart-block-display">
          <ChartDisplay
            chartType={chartType}
            data={displayData}
            showLegend={showLegend}
            showGrid={showGrid}
          />
        </div>

        {/* Data Editor (toggled) — only for static data */}
        {isEditing && (!dataSource || dataSource.type === "static") && (
          <div className="chart-block-editor">
            <ChartDataEditor data={staticData} onChange={handleDataChange} />
          </div>
        )}

        {/* Data Source Config Panel */}
        {showDataSourceConfig && (
          <div className="chart-block-datasource">
            <DataSourceConfig
              dataSource={dataSource}
              blocks={allBlocks}
              onChange={handleDataSourceChange}
              onClose={() => setShowDataSourceConfig(false)}
            />
          </div>
        )}
      </div>
    );
  }
);

export default ChartBlock;
