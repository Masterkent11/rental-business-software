"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Building2, CalendarCheck, MessageSquare, Plus } from "lucide-react";

import { Page, TopBar, SectionHeading } from "@/components/owner/shell";
import { Badge, Card, EmptyState, ErrorState, LinkBtn, Skeleton, Stat } from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { formatDate, peso } from "@/lib/money";
import { useDashboardStore } from "@/stores/use-dashboard-store";
import { useMessagesStore } from "@/stores/use-messages-store";
import { useNotificationsStore } from "@/stores/use-notifications-store";
import { useSessionStore } from "@/stores/use-session-store";

export default function DashboardPage() {
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const user = useSessionStore((s) => s.user);
  const { listings, upcoming, upcomingTotal, awaitingPayment, collection, loading, loaded, error, collectionError, load } = useDashboardStore();
  const conversations = useMessagesStore((s) => s.conversations);
  const unreadTotal = useMessagesStore((s) => s.unreadTotal);
  const latest = useNotificationsStore((s) => s.latest);

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId, load]);

  useEffect(() => {
    if (organizationId && latest?.kind === "BOOKING_RECEIVED") void load(organizationId);
  }, [latest, organizationId, load]);

  const published = listings.filter((l) => l.state === "PUBLISHED").length;
  const drafts = listings.filter((l) => l.state === "DRAFT").length;
  const firstName = user?.displayName.split(" ")[0] ?? "there";

  return (
    <Page>
      <TopBar title={`Good day, ${firstName}`} caption="Here's what's happening across your properties.">
        <LinkBtn href="/properties/new">
          <Plus className="size-4" aria-hidden /> New property
        </LinkBtn>
      </TopBar>

      {error ? (
        <Card><ErrorState message={error} onRetry={() => organizationId && void load(organizationId)} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {loading && !loaded ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)
            ) : (
              <>
                <Stat label="Published listings" value={published} hint={drafts > 0 ? `${drafts} draft${drafts === 1 ? "" : "s"} in progress` : "All caught up"} href="/properties" />
                <Stat label="Upcoming stays" value={upcomingTotal} hint={awaitingPayment > 0 ? `${awaitingPayment} awaiting payment` : "Confirmed and paid"} href="/bookings" />
                <Stat label="Unread messages" value={unreadTotal} hint={`${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`} href="/messages" />
                <Stat
                  label="Received this month"
                  value={collection ? peso(collection.receivedCentavos) : "—"}
                  hint={collectionError ? "Unavailable right now" : collection ? `${peso(collection.outstandingCentavos)} outstanding` : "Loading…"}
                  href="/payments"
                />
              </>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section>
              <SectionHeading title="Upcoming stays">
                <Link href="/bookings" className="focusable flex items-center gap-1 rounded text-[12.5px] font-medium text-muted hover:text-foreground">
                  All bookings <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </SectionHeading>
              <Card>
                {loading && !loaded ? (
                  <div className="space-y-3 p-5"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                ) : upcoming.length === 0 ? (
                  <EmptyState icon={<CalendarCheck className="size-5" aria-hidden />} title="No upcoming stays" body="Confirmed bookings for your nightly listings will appear here." />
                ) : (
                  <ul className="divide-y divide-border">
                    {upcoming.map((booking) => (
                      <li key={booking.id}>
                        <Link href={`/bookings?b=${booking.id}`} className="focusable flex items-center gap-3 px-5 py-3.5 hover:bg-surface-secondary/50">
                          <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                            {booking.photo ? <Photo src={booking.photo} alt="" className="size-full" sizes="44px" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold">{booking.guestName}</p>
                            <p className="truncate text-[12.5px] text-muted">{booking.listingTitle}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[12.5px] font-medium">{formatDate(booking.startsOn)}</p>
                            <p className="text-[11.5px] text-muted">{booking.nights} night{booking.nights === 1 ? "" : "s"}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <SectionHeading title="Recent messages">
                <Link href="/messages" className="focusable flex items-center gap-1 rounded text-[12.5px] font-medium text-muted hover:text-foreground">
                  Inbox <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </SectionHeading>
              <Card>
                {conversations.length === 0 ? (
                  <EmptyState icon={<MessageSquare className="size-5" aria-hidden />} title="No messages yet" body="Customer questions arrive here in real time." />
                ) : (
                  <ul className="divide-y divide-border">
                    {conversations.slice(0, 5).map((conversation) => (
                      <li key={conversation.id}>
                        <Link href={`/messages?c=${conversation.id}`} className="focusable flex items-start gap-3 px-5 py-3.5 hover:bg-surface-secondary/50">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-[13.5px] font-semibold">{conversation.customerName}</p>
                              {conversation.unreadCount > 0 ? <Badge tone="dark">{conversation.unreadCount}</Badge> : null}
                            </div>
                            <p className="truncate text-[12.5px] text-muted">{conversation.lastMessagePreview}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>

          {loaded && listings.length === 0 ? (
            <Card className="mt-8">
              <EmptyState
                icon={<Building2 className="size-5" aria-hidden />}
                title="List your first property"
                body="Add photos, pricing and availability. Customers see it in the app the moment you publish."
                action={<LinkBtn href="/properties/new"><Plus className="size-4" aria-hidden /> Add a property</LinkBtn>}
              />
            </Card>
          ) : null}
        </>
      )}
    </Page>
  );
}
