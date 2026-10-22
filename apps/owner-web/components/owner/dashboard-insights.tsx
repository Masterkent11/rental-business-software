"use client";

import { useEffect, useMemo } from "react";
import { DashboardIcon } from "./dashboard-icon";
import { InsightSparkline } from "./insight-sparkline";
import { bookingTrend } from "./dashboard-view-model";
import { useAnalyticsStore } from "@/stores/use-analytics-store";
import { useSessionStore } from "@/stores/use-session-store";
import { Skeleton } from "./ui";
import { insightColors } from "./insight-palette";

export function OwnerInsights() {
  const scope = useSessionStore(s => s.scope);
  const { data, scopeKey, loading, error, load } = useAnalyticsStore();
  useEffect(() => { if (scope?.kind === "OWNER") void load(scope); }, [scope, load]);
  const matched = scope?.kind === "OWNER" && scopeKey === `OWNER:${scope.organizationId}`;
  const trend = useMemo(() => matched && !error ? bookingTrend(data) : null, [matched, error, data]);
  const metrics = [
    { id: "occupancy", label: "Occupancy rate", icon: "analytics", value: null },
    { id: "bookings", label: "Total bookings", icon: "calendar", value: trend?.total ?? null },
    { id: "earnings", label: "Total earnings", icon: "payments", value: null },
    { id: "views", label: "Property views", icon: "eye", value: null },
  ] as const;
  return <section className="dashboard-insights" aria-label="Owner insights"><div className="dashboard-panel-heading"><h2>Owner insights</h2><span title="The analytics API currently supports a twelve-week window">Last 12 weeks</span></div>
    <div className="dashboard-insights-grid">{metrics.map(({ id, label, icon, value }) => <div className="dashboard-insight" data-metric={id} key={id}>
      <DashboardIcon name={icon} className="dashboard-insight-icon" />
      <div className="dashboard-insight-copy">
        <span className="dashboard-insight-label">{label}{id === "occupancy" ? <span className="dashboard-insight-info" role="img" aria-label="Occupancy data is not available for this workspace" title="Occupancy data is not available for this workspace"><DashboardIcon name="info" /></span> : null}</span>
        {id === "bookings" && (!matched || loading) ? <Skeleton className="mt-2 h-7 w-12" /> : <strong>{value ?? "—"}</strong>}
        <small>{value === null ? "Not available" : "Recorded bookings"}</small>
      </div>
      {id === "bookings" && trend ? <InsightSparkline values={trend.values} color={insightColors[id]} label="Weekly bookings" /> : <span className="dashboard-chart-unavailable">No trend available</span>}
    </div>)}</div>
    {error && matched ? <button className="dashboard-insights-retry focusable" onClick={() => scope && void load(scope)}>Analytics unavailable · Retry</button> : null}
  </section>;
}
