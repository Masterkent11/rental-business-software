"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "./ui";

const InsightChart = dynamic(() => import("./insight-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function InsightSparkline({ values, color, label }: { values: readonly number[]; color: string; label: string }) {
  if (values.length === 0) return <span className="dashboard-sparkline-note">No trend yet</span>;
  if (values.length === 1) return <span className="dashboard-sparkline-note" role="img" aria-label={`${label}: ${values[0]}. One recorded period; trend unavailable.`}>One period</span>;

  return <div className="dashboard-sparkline" role="img" aria-label={`${label}: ${values.join(", ")}`}>
    <InsightChart values={values} color={color} />
  </div>;
}
