"use client";

import dynamic from "next/dynamic";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// Use generic types to avoid strict Plotly type issues
/* eslint-disable @typescript-eslint/no-explicit-any */
interface PlotlyChartProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
}

// Dark theme layout defaults
const darkThemeLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(17,17,17,1)",
  font: {
    color: "#ededed",
    family: "system-ui, sans-serif",
  },
  xaxis: {
    gridcolor: "#262626",
    linecolor: "#262626",
    zerolinecolor: "#262626",
  },
  yaxis: {
    gridcolor: "#262626",
    linecolor: "#262626",
    zerolinecolor: "#262626",
  },
  legend: {
    bgcolor: "rgba(0,0,0,0)",
    font: { color: "#ededed" },
  },
  margin: { t: 40, r: 20, b: 50, l: 60 },
};

const defaultConfig = {
  displayModeBar: true,
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};

export function PlotlyChart({ data, layout, config, className }: PlotlyChartProps) {
  const mergedLayout = {
    ...darkThemeLayout,
    ...layout,
    xaxis: { ...darkThemeLayout.xaxis, ...layout?.xaxis },
    yaxis: { ...darkThemeLayout.yaxis, ...layout?.yaxis },
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
  };

  return (
    <div className={className}>
      <Plot
        data={data}
        layout={mergedLayout}
        config={mergedConfig}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    </div>
  );
}

// Color constants for consistent theming
export const chartColors = {
  primary: "#22c55e",
  secondary: "#3b82f6",
  profit: "#22c55e",
  loss: "#ef4444",
  warning: "#f59e0b",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
  grid: "#262626",
  text: "#ededed",
  muted: "#a1a1a1",
};
