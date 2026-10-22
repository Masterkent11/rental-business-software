import { color as chartColor, graphic } from "echarts/core";
import type { EChartsOption } from "echarts";

export function sparklineOption(values: readonly number[], color: string): EChartsOption {
  return {
    animation: false,
    grid: { left: 2, right: 2, top: 6, bottom: 2, containLabel: false },
    xAxis: { type: "category", show: false, boundaryGap: false, data: values.map((_, index) => index) },
    yAxis: { type: "value", show: false, min: 0, max: Math.max(1, ...values) * 1.1 },
    series: [{
      type: "line",
      data: [...values],
      smooth: 0.45,
      smoothMonotone: "x",
      symbol: "none",
      showSymbol: false,
      silent: true,
      lineStyle: { color, width: 2, cap: "round", join: "round" },
      areaStyle: {
        opacity: 1,
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: chartColor.modifyAlpha(color, 0.48) },
          { offset: 0.65, color: chartColor.modifyAlpha(color, 0.2) },
          { offset: 1, color: chartColor.modifyAlpha(color, 0) },
        ]),
      },
      emphasis: { disabled: true },
    }],
  };
}
