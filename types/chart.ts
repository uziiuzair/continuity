/**
 * Chart types for the canvas block editor
 */

export type ChartType = "bar" | "line" | "pie" | "area" | "donut";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
}

export interface ChartDataConfig {
  labels: string[];
  series: ChartSeries[];
  points?: ChartDataPoint[];
}

// Data source types
export interface StaticDataSource {
  type: "static";
}

export interface DatabaseDataSource {
  type: "database";
  databaseBlockId: string;
  labelColumnId: string;
  valueColumnIds: string[];
  aggregation?: "sum" | "count" | "average" | "min" | "max";
}

export interface ApiDataSource {
  type: "api";
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  pollingIntervalMs: number;
  jsonPath: string;
  labelField: string;
  valueFields: string[];
}

export type ChartDataSource =
  | StaticDataSource
  | DatabaseDataSource
  | ApiDataSource;

export type ColumnLayout =
  | "1"
  | "1/1"
  | "1/1/1"
  | "2/1"
  | "1/2"
  | "2/3"
  | "3/2";

// Default sample data for new charts
export const DEFAULT_CHART_DATA: ChartDataConfig = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May"],
  series: [
    { name: "Series 1", data: [40, 30, 50, 45, 60], color: "#7240fe" },
  ],
};

export const CHART_COLORS = [
  "#7240fe",
  "#ee5180",
  "#00c68e",
  "#ffb600",
  "#02d8df",
  "#d36cff",
  "#ff8b58",
  "#ff3956",
];
