"use client";

import { memo, useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { sparklineOption } from "./sparkline-option";

echarts.use([LineChart, GridComponent, SVGRenderer]);
const chartStyle = { width: "100%", height: "100%" };
const chartOptions = { renderer: "svg" as const };

function InsightChart({ values, color }: { values: readonly number[]; color: string }) {
  const option = useMemo(() => sparklineOption(values, color), [values, color]);
  return <ReactEChartsCore echarts={echarts} option={option} opts={chartOptions} style={chartStyle} notMerge autoResize />;
}

export default memo(InsightChart);
