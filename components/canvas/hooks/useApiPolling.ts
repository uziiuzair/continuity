"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ApiDataSource, ChartDataConfig } from "@/types/chart";

interface UseApiPollingResult {
  data: ChartDataConfig | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

/**
 * Resolves a dot-path like "data.results[*].price" against a JSON value.
 * - Simple paths: "data.total" → obj.data.total
 * - Array spread: "data.items[*].value" → maps over array
 */
function resolveJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current == null) return undefined;

    // Check for array spread: "items[*]"
    const arrayMatch = part.match(/^(.+)\[\*\]$/);
    if (arrayMatch) {
      const key = arrayMatch[1];
      const arr = (current as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) return undefined;

      // Resolve remaining path for each item
      const remainingPath = parts.slice(i + 1).join(".");
      if (!remainingPath) return arr;
      return arr.map((item) => resolveJsonPath(item, remainingPath));
    }

    // Check for array index: "items[0]"
    const indexMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (indexMatch) {
      const key = indexMatch[1];
      const index = parseInt(indexMatch[2], 10);
      const arr = (current as Record<string, unknown>)[key];
      if (!Array.isArray(arr)) return undefined;
      current = arr[index];
      continue;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function mapApiResponseToChartData(
  response: unknown,
  source: ApiDataSource
): ChartDataConfig {
  const base = source.jsonPath
    ? resolveJsonPath(response, source.jsonPath)
    : response;

  if (!Array.isArray(base)) {
    return { labels: [], series: [] };
  }

  const labels = base.map((item) => {
    const val = resolveJsonPath(item, source.labelField);
    return String(val ?? "");
  });

  const series = source.valueFields.map((field) => ({
    name: field,
    data: base.map((item) => {
      const val = resolveJsonPath(item, field);
      return typeof val === "number" ? val : parseFloat(String(val)) || 0;
    }),
  }));

  return { labels, series };
}

export function useApiPolling(
  source: ApiDataSource | undefined
): UseApiPollingResult {
  const [data, setData] = useState<ChartDataConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const fetchData = useCallback(async () => {
    const src = sourceRef.current;
    if (!src?.url) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try Tauri HTTP plugin first, fall back to native fetch
      let response: Response;
      try {
        const { fetch: tauriFetch } = await import(
          "@tauri-apps/plugin-http"
        );
        response = await tauriFetch(src.url, {
          method: src.method ?? "GET",
          headers: src.headers ?? {},
        });
      } catch {
        // Fallback for dev/web environment
        response = await fetch(src.url, {
          method: src.method ?? "GET",
          headers: src.headers ?? {},
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const chartData = mapApiResponseToChartData(json, src);
      setData(chartData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up polling interval
  useEffect(() => {
    if (!source?.url) {
      setData(null);
      return;
    }

    // Initial fetch
    fetchData();

    // Set up interval (minimum 5s)
    const intervalMs = Math.max(source.pollingIntervalMs ?? 30000, 5000);
    intervalRef.current = setInterval(fetchData, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [source?.url, source?.pollingIntervalMs, source?.method, fetchData]);

  return { data, isLoading, error, lastUpdated, refresh: fetchData };
}
