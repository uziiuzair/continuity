"use client";

import { useCallback } from "react";
import type { ChartDataConfig } from "@/types/chart";

interface ChartDataEditorProps {
  data: ChartDataConfig;
  onChange: (data: ChartDataConfig) => void;
}

export default function ChartDataEditor({
  data,
  onChange,
}: ChartDataEditorProps) {
  const handleLabelChange = useCallback(
    (index: number, value: string) => {
      const newLabels = [...data.labels];
      newLabels[index] = value;
      onChange({ ...data, labels: newLabels });
    },
    [data, onChange]
  );

  const handleValueChange = useCallback(
    (seriesIdx: number, rowIdx: number, value: string) => {
      const num = parseFloat(value);
      if (isNaN(num) && value !== "" && value !== "-") return;

      const newSeries = data.series.map((s, si) => {
        if (si !== seriesIdx) return s;
        const newData = [...s.data];
        newData[rowIdx] = value === "" || value === "-" ? 0 : num;
        return { ...s, data: newData };
      });
      onChange({ ...data, series: newSeries });
    },
    [data, onChange]
  );

  const handleSeriesNameChange = useCallback(
    (seriesIdx: number, name: string) => {
      const newSeries = data.series.map((s, si) =>
        si === seriesIdx ? { ...s, name } : s
      );
      onChange({ ...data, series: newSeries });
    },
    [data, onChange]
  );

  const addRow = useCallback(() => {
    const newLabels = [...data.labels, `Item ${data.labels.length + 1}`];
    const newSeries = data.series.map((s) => ({
      ...s,
      data: [...s.data, 0],
    }));
    onChange({ ...data, labels: newLabels, series: newSeries });
  }, [data, onChange]);

  const removeRow = useCallback(
    (index: number) => {
      if (data.labels.length <= 1) return;
      const newLabels = data.labels.filter((_, i) => i !== index);
      const newSeries = data.series.map((s) => ({
        ...s,
        data: s.data.filter((_, i) => i !== index),
      }));
      onChange({ ...data, labels: newLabels, series: newSeries });
    },
    [data, onChange]
  );

  const addSeries = useCallback(() => {
    const newSeries = [
      ...data.series,
      {
        name: `Series ${data.series.length + 1}`,
        data: data.labels.map(() => 0),
      },
    ];
    onChange({ ...data, series: newSeries });
  }, [data, onChange]);

  const removeSeries = useCallback(
    (index: number) => {
      if (data.series.length <= 1) return;
      const newSeries = data.series.filter((_, i) => i !== index);
      onChange({ ...data, series: newSeries });
    },
    [data, onChange]
  );

  return (
    <div className="chart-data-editor">
      <div className="chart-data-table-wrap">
        <table className="chart-data-table">
          <thead>
            <tr>
              <th className="chart-data-th chart-data-th-label">Label</th>
              {data.series.map((s, si) => (
                <th key={si} className="chart-data-th">
                  <div className="chart-data-series-header">
                    <input
                      className="chart-data-series-name"
                      value={s.name}
                      onChange={(e) =>
                        handleSeriesNameChange(si, e.target.value)
                      }
                    />
                    {data.series.length > 1 && (
                      <button
                        className="chart-data-remove-btn"
                        onClick={() => removeSeries(si)}
                        title="Remove series"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="chart-data-th chart-data-th-actions" />
            </tr>
          </thead>
          <tbody>
            {data.labels.map((label, ri) => (
              <tr key={ri}>
                <td className="chart-data-td">
                  <input
                    className="chart-data-input"
                    value={label}
                    onChange={(e) => handleLabelChange(ri, e.target.value)}
                  />
                </td>
                {data.series.map((s, si) => (
                  <td key={si} className="chart-data-td">
                    <input
                      className="chart-data-input chart-data-input-number"
                      type="number"
                      value={s.data[ri] ?? 0}
                      onChange={(e) =>
                        handleValueChange(si, ri, e.target.value)
                      }
                    />
                  </td>
                ))}
                <td className="chart-data-td chart-data-td-actions">
                  {data.labels.length > 1 && (
                    <button
                      className="chart-data-remove-btn"
                      onClick={() => removeRow(ri)}
                      title="Remove row"
                    >
                      &times;
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-data-actions">
        <button className="chart-data-add-btn" onClick={addRow}>
          + Add Row
        </button>
        <button className="chart-data-add-btn" onClick={addSeries}>
          + Add Series
        </button>
      </div>
    </div>
  );
}
