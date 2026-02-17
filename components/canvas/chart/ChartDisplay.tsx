"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartType, ChartDataConfig } from "@/types/chart";
import { CHART_COLORS } from "@/types/chart";

interface ChartDisplayProps {
  chartType: ChartType;
  data: ChartDataConfig;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
}

export default function ChartDisplay({
  chartType,
  data,
  showLegend = true,
  showGrid = true,
  colors,
}: ChartDisplayProps) {
  const palette = colors ?? CHART_COLORS;

  // Transform data for Recharts format
  const chartData = useMemo(() => {
    if (!data.labels || !data.series || data.series.length === 0) return [];
    return data.labels.map((label, i) => {
      const point: Record<string, string | number> = { name: label };
      data.series.forEach((s) => {
        point[s.name] = s.data[i] ?? 0;
      });
      return point;
    });
  }, [data]);

  // Pie/donut data uses first series only
  const pieData = useMemo(() => {
    if (!data.labels || !data.series?.[0]) return [];
    return data.labels.map((label, i) => ({
      name: label,
      value: data.series[0].data[i] ?? 0,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="chart-display-empty">
        No data to display. Add some data points.
      </div>
    );
  }

  const seriesNames = data.series.map((s) => s.name);

  switch (chartType) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#eee" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
            <YAxis tick={{ fontSize: 12 }} stroke="#999" />
            <Tooltip />
            {showLegend && seriesNames.length > 1 && <Legend />}
            {seriesNames.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                fill={data.series[i].color ?? palette[i % palette.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#eee" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
            <YAxis tick={{ fontSize: 12 }} stroke="#999" />
            <Tooltip />
            {showLegend && seriesNames.length > 1 && <Legend />}
            {seriesNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={data.series[i].color ?? palette[i % palette.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#eee" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#999" />
            <YAxis tick={{ fontSize: 12 }} stroke="#999" />
            <Tooltip />
            {showLegend && seriesNames.length > 1 && <Legend />}
            {seriesNames.map((name, i) => {
              const color =
                data.series[i].color ?? palette[i % palette.length];
              return (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      );

    case "pie":
    case "donut":
      return (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === "donut" ? 60 : 0}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={true}
            >
              {pieData.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={palette[i % palette.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
