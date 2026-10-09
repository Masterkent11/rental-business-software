"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarClock, ListTodo, MailOpen } from "lucide-react";

import { Page, SectionHeading, TopBar } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, LinkBtn, Skeleton, Stat } from "@/components/owner/ui";
import { formatDateTime } from "@/lib/money";
import { VERIFICATION_LABEL } from "@/domain/agents/agent";
import { formatResponseTime } from "@/domain/agents/dashboard";
import { INQUIRY_STATUS_LABEL, PIPELINE } from "@/domain/inquiries/inquiry";
import { formatTime } from "@/domain/viewings/viewing";
import { useAgentStore } from "@/stores/use-agent-store";
import { useEngagementStore } from "@/stores/use-engagement-store";

export default function AgentDashboardPage() {
  const { dashboard, dashboardError, loadDashboard } = useAgentStore();
  const inquiries = useEngagementStore((s) => s.inquiries);
  const viewings = useEngagementStore((s) => s.viewings);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, inquiries, viewings]);

  if (!dashboard) {
    return (
      <Page>
        {dashboardError ? (
          <Card>
            <ErrorState message={dashboardError} onRetry={() => void loadDashboard()} />
          </Card>
        ) : (
          <>
            <Skeleton className="mb-6 h-9 w-72" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          </>
        )}
      </Page>
    );
  }

  const { agent, metrics, response, pipeline, today, recentInquiries } = dashboard;
  const pipelineTotal = PIPELINE.reduce((sum, status) => sum + pipeline[status], 0);

  return (
    <Page>
      <TopBar title={`Hello, ${agent.displayName.split(" ")[0]}`} caption="Your leads, viewings and follow-ups for today.">
        <Badge tone={agent.verificationState === "VERIFIED" ? "ok" : "pending"}>
          {agent.verificationState === "VERIFIED" ? <BadgeCheck className="size-3" aria-hidden /> : null}
          {VERIFICATION_LABEL[agent.verificationState]}
        </Badge>
      </TopBar>

      {metrics.pendingInvitations > 0 ? (
        <Link href="/agent/properties" className="focusable mb-6 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 hover:border-foreground/25">
          <MailOpen className="size-5 text-muted" aria-hidden />
          <span className="flex-1 text-[13.5px]">
            {metrics.pendingInvitations} owner invitation{metrics.pendingInvitations === 1 ? "" : "s"} waiting for your answer
          </span>
          <span className="text-[13px] font-medium">Review</span>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="New inquiries" value={metrics.newInquiries} href="/agent/leads" />
        <Stat label="Active clients" value={metrics.activeClients} href="/agent/clients" />
        <Stat label="Viewings today" value={metrics.viewingsToday} href="/agent/viewings" />
        <Stat label="Follow-ups due" value={metrics.followUpsDue} href="/agent/tasks" />
        <Stat label="Deals in progress" value={metrics.dealsInProgress} href="/agent/leads" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <SectionHeading title="Today" caption="Viewings and follow-ups scheduled for today." />
          <Card>
            {today.length === 0 ? (
              <EmptyState icon={<CalendarClock className="size-5" aria-hidden />} title="Nothing scheduled today" body="Confirmed viewings and follow-ups due today appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {today.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link href={item.kind === "VIEWING" ? "/agent/viewings" : "/agent/tasks"} className="focusable flex items-center gap-4 px-5 py-3.5 hover:bg-surface-secondary/50">
                      <span className="tabular w-16 shrink-0 text-[14px] font-semibold">{formatTime(item.at)}</span>
                      {item.kind === "VIEWING" ? <CalendarClock className="size-4 shrink-0 text-muted" aria-hidden /> : <ListTodo className="size-4 shrink-0 text-muted" aria-hidden />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{item.title}</span>
                        <span className="block truncate text-[12.5px] text-muted">{item.subtitle}</span>
                      </span>
                      <Badge>{item.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="mt-6">
            <SectionHeading title="Latest inquiries">
              <LinkBtn href="/agent/leads" size="sm" variant="ghost">
                All leads
              </LinkBtn>
            </SectionHeading>
            <Card>
              {recentInquiries.length === 0 ? (
                <EmptyState title="No inquiries yet" body="Inquiries on properties you represent appear here." />
              ) : (
                <ul className="divide-y divide-border">
                  {recentInquiries.map((inquiry) => (
                    <li key={inquiry.id}>
                      <Link href={`/agent/messages?c=${inquiry.conversationId}`} className="focusable flex items-center gap-3 px-5 py-3.5 hover:bg-surface-secondary/50">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{inquiry.customerName}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {inquiry.listingTitle} · {formatDateTime(inquiry.createdAt)}
                          </span>
                        </span>
                        <Badge tone={inquiry.status === "NEW" ? "dark" : "neutral"}>{INQUIRY_STATUS_LABEL[inquiry.status]}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div>
            <SectionHeading title="Pipeline" caption={`${pipelineTotal} lead${pipelineTotal === 1 ? "" : "s"} in total`} />
            <Card className="p-5">
              <ul className="flex flex-col gap-2.5">
                {PIPELINE.map((status) => (
                  <li key={status} className="flex items-center gap-3 text-[13px]">
                    <span className="w-24 shrink-0 text-muted">{INQUIRY_STATUS_LABEL[status]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                      <span className="block h-full rounded-full bg-foreground" style={{ width: `${pipelineTotal === 0 ? 0 : (pipeline[status] / pipelineTotal) * 100}%` }} />
                    </span>
                    <span className="tabular w-8 text-right font-medium">{pipeline[status]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div>
            <SectionHeading title="Response" />
            <Card className="p-5">
              {response.sampleSize < 3 || response.respondedWithinDayRate === null ? (
                <p className="text-[13px] text-muted">Response metrics appear after you have replied to at least 3 inquiries.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-[12px] text-muted">Replied within 24 h</dt>
                    <dd className="tabular mt-1 text-[22px] font-semibold">{Math.round(response.respondedWithinDayRate * 100)}%</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-muted">Median first reply</dt>
                    <dd className="tabular mt-1 text-[22px] font-semibold">{formatResponseTime(response.medianResponseMinutes)}</dd>
                  </div>
                  <p className="col-span-2 text-[11.5px] text-muted">Based on {response.sampleSize} inquiries in the last 90 days.</p>
                </dl>
              )}
            </Card>
          </div>
          <div>
            <SectionHeading title="Represented properties" />
            <Stat label="Active" value={metrics.representedListings} href="/agent/properties" />
          </div>
        </section>
      </div>
    </Page>
  );
}
