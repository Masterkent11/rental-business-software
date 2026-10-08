"use client";

import { useEffect } from "react";
import { ChartColumn } from "lucide-react";

import { Page, SectionHeading, TableScroll, TopBar } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, Skeleton, Stat } from "@/components/owner/ui";
import { conversionRate, totals } from "@/domain/analytics/analytics";
import { INQUIRY_STATUS_LABEL, PIPELINE } from "@/domain/inquiries/inquiry";
import { useAnalyticsStore } from "@/stores/use-analytics-store";
import { useSessionStore } from "@/stores/use-session-store";

const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });

export function AnalyticsView() {
  const scope = useSessionStore((s) => s.scope);
  const { data, loading, error, load } = useAnalyticsStore();

  useEffect(() => {
    if (scope) void load(scope);
  }, [scope, load]);

  if (!scope) return null;
  const agent = scope.kind === "AGENT";

  return (
    <Page>
      <TopBar title="Analytics" caption="Counted from real inquiries, viewings and bookings over the last 12 weeks." />
      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={() => void load(scope)} />
        </Card>
      ) : !data ? null : (
        <AnalyticsBody agent={agent} />
      )}
    </Page>
  );
}

function AnalyticsBody({ agent }: { agent: boolean }) {
  const data = useAnalyticsStore((s) => s.data)!;
  const sum = totals(data);
  const rate = conversionRate(data);
  const peak = Math.max(1, ...data.weekly.map((w) => Math.max(w.inquiries, w.viewings, w.bookings)));

  if (sum.inquiries === 0 && sum.viewings === 0 && sum.bookings === 0 && data.listings.length === 0) {
    return (
      <Card>
        <EmptyState icon={<ChartColumn className="size-5" aria-hidden />} title="No activity yet" body="Numbers appear once customers start inquiring, booking viewings or making bookings." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Inquiries" value={sum.inquiries} />
        <Stat label="Viewings" value={sum.viewings} hint={`${sum.completedViewings} completed`} />
        <Stat label={agent ? "Closed deals" : "Bookings"} value={agent ? data.inquiriesByStatus.CLOSED : sum.bookings} />
        <Stat label="Inquiry to close" value={rate === null ? "—" : `${Math.round(rate * 100)}%`} hint={rate === null ? "No inquiries yet" : undefined} />
      </div>

      <section>
        <SectionHeading title="Weekly activity" caption="Inquiries, viewings and bookings created each week." />
        <Card className="p-5">
          <div className="flex h-48 items-end gap-2" role="img" aria-label="Weekly activity chart">
            {data.weekly.map((week) => (
              <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-40 w-full items-end justify-center gap-0.5">
                  <span className="w-1/4 rounded-t bg-foreground" style={{ height: `${(week.inquiries / peak) * 100}%` }} title={`${week.inquiries} inquiries`} />
                  <span className="w-1/4 rounded-t bg-[#1d4ed8]" style={{ height: `${(week.viewings / peak) * 100}%` }} title={`${week.viewings} viewings`} />
                  {agent ? null : <span className="w-1/4 rounded-t bg-success" style={{ height: `${(week.bookings / peak) * 100}%` }} title={`${week.bookings} bookings`} />}
                </div>
                <span className="text-[10.5px] text-muted">{weekLabel(week.weekStart)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-[12px] text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-foreground" />Inquiries</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#1d4ed8]" />Viewings</span>
            {agent ? null : <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" />Bookings</span>}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading title="Pipeline" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {PIPELINE.map((status) => (
            <Card key={status} className="p-4">
              <p className="text-[12px] text-muted">{INQUIRY_STATUS_LABEL[status]}</p>
              <p className="tabular mt-1 text-[22px] font-semibold">{data.inquiriesByStatus[status]}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="By property" />
        <Card>
          <TableScroll>
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] text-muted">
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-3 py-3 font-medium">Inquiries</th>
                  <th className="px-3 py-3 font-medium">Viewings</th>
                  <th className="px-3 py-3 font-medium">Bookings</th>
                  <th className="px-3 py-3 font-medium">Conversations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.listings.map((row) => (
                  <tr key={row.listingId}>
                    <td className="px-5 py-3">
                      <span className="font-medium">{row.title}</span>{" "}
                      {row.intent === "SALE" ? <Badge tone="dark">Sale</Badge> : <Badge>Rent</Badge>}
                    </td>
                    <td className="tabular px-3 py-3">{row.inquiries}</td>
                    <td className="tabular px-3 py-3">{row.viewings}</td>
                    <td className="tabular px-3 py-3">{row.intent === "SALE" ? "—" : row.bookings}</td>
                    <td className="tabular px-3 py-3">{row.conversations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </section>
    </div>
  );
}
