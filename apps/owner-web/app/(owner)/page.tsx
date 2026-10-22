"use client";

import Image from "next/image";
import { useShallow } from "zustand/react/shallow";
import { isOpenInquiry } from "@/domain/inquiries/inquiry";
import { useEffect } from "react";
import { Plus } from "lucide-react";
import { LinkBtn } from "@/components/owner/ui";
import { DashboardMetric } from "@/components/owner/dashboard-metric";
import { UpcomingStaysPanel, RecentMessagesPanel } from "@/components/owner/dashboard-activity";
import { OwnerInsights } from "@/components/owner/dashboard-insights";
import { peso } from "@/lib/money";
import { useDashboardStore } from "@/stores/use-dashboard-store";
import { useMessagesStore } from "@/stores/use-messages-store";
import { useNotificationsStore } from "@/stores/use-notifications-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useEngagementStore } from "@/stores/use-engagement-store";

export default function DashboardPage() {
  const organizationId = useSessionStore(s => s.activeOrganizationId);
  const user = useSessionStore(s => s.user);
  const dashboard = useDashboardStore();
  const loadDashboard = dashboard.load;
  const messages = useMessagesStore(useShallow(s => ({
    scope: s.scope, conversations: s.conversations, unreadTotal: s.unreadTotal,
    loaded: s.loaded, error: s.error, refresh: s.refresh,
  })));
  const engagement = useEngagementStore(useShallow(s => ({
    scope: s.scope, inquiries: s.inquiries, viewings: s.viewings, now: s.now,
    inquiriesLoaded: s.inquiriesLoaded, inquiriesError: s.inquiriesError,
    viewingsLoaded: s.viewingsLoaded, viewingsError: s.viewingsError,
    loadInquiries: s.loadInquiries, loadViewings: s.loadViewings,
  })));
  const latest = useNotificationsStore(s => s.latest);
  useEffect(() => { if (organizationId) void loadDashboard(organizationId); }, [organizationId, loadDashboard]);
  useEffect(() => { if (organizationId && latest?.kind === "BOOKING_RECEIVED") void loadDashboard(organizationId); }, [latest, organizationId, loadDashboard]);
  const matched = dashboard.organizationId === organizationId;
  const waiting = !matched || (!dashboard.loaded && !dashboard.error);
  const messagesMatched = messages.scope?.kind === "OWNER" && messages.scope.organizationId === organizationId;
  const engagementMatched = engagement.scope?.kind === "OWNER" && engagement.scope.organizationId === organizationId;
  const retry = () => { if (organizationId) void dashboard.load(organizationId); };
  const inquiries = engagementMatched ? engagement.inquiries : [];
  const viewings = engagementMatched ? engagement.viewings : [];
  const published = matched ? dashboard.listings.filter(item => item.state === "PUBLISHED").length : 0;
  const drafts = matched ? dashboard.listings.filter(item => item.state === "DRAFT").length : 0;
  return <main className="owner-dashboard">
    <header className="dashboard-header"><Image className="dashboard-header-art" src="/assets/dashboard/owner-header-banner.jpg" alt="" fill sizes="(min-width: 1024px) calc(100vw - 310px), 100vw" preload />
      <div className="dashboard-greeting"><h1>Good day, {user?.displayName.trim().split(/\s+/)[0] || "there"}</h1><p>Here&apos;s what&apos;s happening across your properties.</p></div>
      <div className="dashboard-header-actions"><LinkBtn href="/properties/new?intent=sale" variant="outline"><Plus aria-hidden size={20} />Property for sale</LinkBtn><LinkBtn href="/properties/new"><Plus aria-hidden size={20} />Rental</LinkBtn></div>
    </header>
    <div className="dashboard-body"><div className="dashboard-primary-metrics">
      <DashboardMetric label="Published listings" illustration="published-listings" value={published} hint={drafts ? `${drafts} drafts in progress` : "All caught up"} href="/properties?state=PUBLISHED" loading={waiting} error={matched ? dashboard.error : null} onRetry={retry} />
      <DashboardMetric label="Upcoming stays" illustration="upcoming-stays" value={dashboard.upcomingTotal} hint="Confirmed and paid" href="/bookings?bucket=UPCOMING" loading={waiting} error={matched ? dashboard.error : null} onRetry={retry} />
      <DashboardMetric label="Unread messages" illustration="unread-messages" value={messages.unreadTotal} hint={`${messagesMatched ? messages.conversations.length : 0} conversations`} href="/messages?unread=1" loading={!messagesMatched || (!messages.loaded && !messages.error)} error={messagesMatched ? messages.error : null} onRetry={() => void messages.refresh()} />
      <DashboardMetric label="Received this month" illustration="received-this-month" value={matched && dashboard.collection ? peso(dashboard.collection.receivedCentavos) : "—"} hint={dashboard.collection ? "Recorded payments" : "Unavailable right now"} href="/payments" loading={!matched || dashboard.collectionLoading} error={matched ? dashboard.collectionError : null} onRetry={() => organizationId && void dashboard.loadCollection(organizationId)} />
    </div>
    <div className="dashboard-secondary-metrics">
      <DashboardMetric label="New inquiries" illustration="new-inquiries" value={inquiries.filter(item => item.status === "NEW").length} hint={`${inquiries.filter(item => isOpenInquiry(item.status)).length} open in the pipeline`} href="/inquiries?status=NEW" loading={!engagementMatched || !engagement.inquiriesLoaded} error={engagementMatched ? engagement.inquiriesError : null} onRetry={() => void engagement.loadInquiries()} />
      <DashboardMetric label="Viewing requests" illustration="viewing-requests" value={viewings.filter(item => item.status === "REQUESTED").length} hint={`${viewings.filter(item => item.status === "CONFIRMED" && item.scheduledAt && Date.parse(item.scheduledAt) > engagement.now).length} confirmed and upcoming`} href="/viewings?status=REQUESTED" loading={!engagementMatched || !engagement.viewingsLoaded} error={engagementMatched ? engagement.viewingsError : null} onRetry={() => void engagement.loadViewings()} />
    </div>
    <div className="dashboard-activity-grid"><UpcomingStaysPanel bookings={matched ? dashboard.upcoming : []} loading={waiting} error={matched ? dashboard.error : null} retry={retry} /><RecentMessagesPanel conversations={messagesMatched ? messages.conversations : []} loading={!messagesMatched || (!messages.loaded && !messages.error)} error={messagesMatched ? messages.error : null} retry={() => void messages.refresh()} /></div>
    <OwnerInsights /></div>
  </main>;
}
