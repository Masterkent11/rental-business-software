"use client";

import { useEffect, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, ListTodo } from "lucide-react";
import { DashboardHeader } from "@/components/owner/dashboard-header";
import { DashboardMetric } from "@/components/owner/dashboard-metric";
import { Badge, ErrorState, Skeleton } from "@/components/owner/ui";
import { formatDateTime } from "@/lib/money";
import { formatResponseTime } from "@/domain/agents/dashboard";
import { INQUIRY_STATUS_LABEL, PIPELINE } from "@/domain/inquiries/inquiry";
import { formatTime } from "@/domain/viewings/viewing";
import { useAgentStore } from "@/stores/use-agent-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useEngagementStore } from "@/stores/use-engagement-store";
import "./dashboard.css";

function Illustration({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <Image
      src={`/assets/dashboard/agent/${name}.svg`}
      alt=""
      width={220}
      height={150}
      className={className}
    />
  );
}

function Panel({
  title,
  caption,
  href,
  link,
  children,
  className = "",
}: {
  title: string;
  caption?: string;
  href?: string;
  link?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dashboard-panel agent-dashboard-panel ${className}`}>
      <div className="dashboard-panel-heading">
        <div>
          <h2>{title}</h2>
          {caption ? <p>{caption}</p> : null}
        </div>
        {href ? (
          <Link href={href}>
            {link}
            <ArrowRight size={17} aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({
  illustration,
  title,
  body,
}: {
  illustration: string;
  title: string;
  body: string;
}) {
  return (
    <div className="agent-dashboard-empty">
      <Illustration name={illustration} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function AgentDashboardView() {
  const { dashboard, dashboardError, loadDashboard } = useAgentStore();
  const user = useSessionStore((s) => s.user);
  const workspace = useSessionStore((s) => s.activeWorkspace);
  const inquiries = useEngagementStore((s) => s.inquiries);
  const viewings = useEngagementStore((s) => s.viewings);
  const agentId = workspace?.kind === "AGENT" ? workspace.agentId : null;
  useEffect(() => {
    if (agentId) void loadDashboard();
  }, [agentId, user?.id, loadDashboard, inquiries, viewings]);
  const current = dashboard?.agent.id === agentId ? dashboard : null;
  const loading = !current && !dashboardError;
  const metrics = current?.metrics;
  const pipelineTotal = current
    ? PIPELINE.reduce((sum, status) => sum + current.pipeline[status], 0)
    : 0;
  return (
    <main className="owner-dashboard agent-dashboard">
      <DashboardHeader
        name={current?.agent.displayName ?? user?.displayName ?? ""}
        caption="Here's what's happening across your clients and represented properties."
      />
      <div className="dashboard-body">
        {dashboardError ? (
          <div className="agent-dashboard-error" role="alert">
            <ErrorState
              message={dashboardError}
              onRetry={() => void loadDashboard()}
            />
          </div>
        ) : null}
        {metrics && metrics.pendingInvitations > 0 ? (
          <Link
            href="/agent/properties"
            className="agent-invitations focusable"
          >
            {metrics.pendingInvitations} owner invitation
            {metrics.pendingInvitations === 1 ? "" : "s"} waiting for your
            answer <span>Review</span>
          </Link>
        ) : null}
        <div className="agent-dashboard-metrics">
          <DashboardMetric
            assetDirectory="agent"
            label="New inquiries"
            illustration="new-inquiries"
            value={metrics?.newInquiries ?? 0}
            hint={`${metrics?.newInquiries ?? 0} open in the pipeline`}
            href="/agent/leads"
            loading={loading}
            error={dashboardError}
          />
          <DashboardMetric
            assetDirectory="agent"
            label="Active clients"
            illustration="active-clients"
            value={metrics?.activeClients ?? 0}
            hint="All clients"
            href="/agent/clients"
            loading={loading}
            error={dashboardError}
          />
          <DashboardMetric
            assetDirectory="agent"
            label="Viewings today"
            illustration="viewings-today"
            value={metrics?.viewingsToday ?? 0}
            hint={`${metrics?.viewingsToday ?? 0} scheduled`}
            href="/agent/viewings"
            loading={loading}
            error={dashboardError}
          />
          <DashboardMetric
            assetDirectory="agent"
            label="Follow ups due"
            illustration="follow-ups"
            value={metrics?.followUpsDue ?? 0}
            hint={`${metrics?.followUpsDue ?? 0} requiring action`}
            href="/agent/tasks"
            loading={loading}
            error={dashboardError}
          />
          <DashboardMetric
            assetDirectory="agent"
            label="Deals in progress"
            illustration="deals"
            value={metrics?.dealsInProgress ?? 0}
            hint={`${metrics?.dealsInProgress ?? 0} active deals`}
            href="/agent/leads"
            loading={loading}
            error={dashboardError}
          />
        </div>
        {!current ? (
          loading ? (
            <div
              className="agent-dashboard-grid"
              aria-label="Loading dashboard"
            >
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : null
        ) : (
          <div className="agent-dashboard-grid">
            <Panel
              title="Today’s activities"
              caption="Viewings and follow ups scheduled for today."
              href="/agent/tasks"
              link="All activities"
            >
              {!current.today.length ? (
                <EmptyPanel
                  illustration="no-activities"
                  title="Nothing scheduled today"
                  body="Confirmed viewings and follow ups due today appear here."
                />
              ) : (
                <ul className="agent-activity-list">
                  {current.today.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        href={
                          item.kind === "VIEWING"
                            ? "/agent/viewings"
                            : "/agent/tasks"
                        }
                      >
                        <time dateTime={item.at}>{formatTime(item.at)}</time>
                        {item.kind === "VIEWING" ? (
                          <CalendarClock size={18} aria-hidden />
                        ) : (
                          <ListTodo size={18} aria-hidden />
                        )}
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </span>
                        <Badge>{item.status}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel
              title="Pipeline"
              caption={`${pipelineTotal} leads in total`}
              href="/agent/leads"
              link="All leads"
            >
              <ul className="agent-pipeline">
                {PIPELINE.map((status) => (
                  <li key={status}>
                    <span>{INQUIRY_STATUS_LABEL[status]}</span>
                    <span
                      className="agent-pipeline-track"
                      role="meter"
                      aria-label={INQUIRY_STATUS_LABEL[status]}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(1, pipelineTotal)}
                      aria-valuenow={current.pipeline[status]}
                    >
                      <span
                        style={{
                          width: `${pipelineTotal ? (current.pipeline[status] / pipelineTotal) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <strong>{current.pipeline[status]}</strong>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel
              title="Latest inquiries"
              href="/agent/leads"
              link="All inquiries"
              className="agent-inquiries-panel"
            >
              {!current.recentInquiries.length ? (
                <EmptyPanel
                  illustration="empty-inquiries"
                  title="No new inquiries"
                  body="New property inquiries will appear here."
                />
              ) : (
                <ul className="agent-activity-list">
                  {current.recentInquiries.map((inquiry) => (
                    <li key={inquiry.id}>
                      <Link
                        href={`/agent/messages?c=${inquiry.conversationId}`}
                      >
                        <span>
                          <strong>{inquiry.customerName}</strong>
                          <small>
                            {inquiry.listingTitle} ·{" "}
                            {formatDateTime(inquiry.createdAt)}
                          </small>
                        </span>
                        <Badge
                          tone={inquiry.status === "NEW" ? "dark" : "neutral"}
                        >
                          {INQUIRY_STATUS_LABEL[inquiry.status]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Response" className="agent-response-panel">
              <div className="agent-response-content">
                {current.response.sampleSize < 3 ||
                  current.response.respondedWithinDayRate === null ? (
                  <p>
                    Response metrics appear after you have replied to at least 3
                    inquiries.
                  </p>
                ) : (
                  <dl>
                    <div>
                      <dt>Replied within 24 h</dt>
                      <dd>
                        {Math.round(
                          current.response.respondedWithinDayRate * 100,
                        )}
                        %
                      </dd>
                    </div>
                    <div>
                      <dt>Median first reply</dt>
                      <dd>
                        {formatResponseTime(
                          current.response.medianResponseMinutes,
                        )}
                      </dd>
                    </div>
                    <p>
                      Based on {current.response.sampleSize} inquiries in the
                      last 90 days.
                    </p>
                  </dl>
                )}
                <Illustration name="response" />
              </div>
            </Panel>
          </div>
        )}
      </div>
    </main>
  );
}
