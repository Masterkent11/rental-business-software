import Link from "next/link";
import { ArrowRight, CalendarDays, Moon, Building2 } from "lucide-react";
import type { OwnerBooking } from "@/domain/bookings/booking";
import type { Conversation } from "@/domain/messaging/conversation";
import { recentConversations } from "./dashboard-view-model";
import { EmptyState, ErrorState, Skeleton } from "./ui";
import { Photo } from "./photo";

const day = (iso: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const timestamp = (iso: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(iso));

function PanelHeading({ title, href, action }: { title: string; href: string; action: string }) {
  return <div className="dashboard-panel-heading"><h2>{title}</h2><Link href={href} className="focusable">{action}<ArrowRight size={15} aria-hidden /></Link></div>;
}
export function UpcomingStaysPanel({ bookings, loading, error, retry }: { bookings: readonly OwnerBooking[]; loading: boolean; error: string | null; retry: () => void }) {
  return <section className="dashboard-panel"><PanelHeading title="Upcoming stays" href="/bookings?bucket=UPCOMING" action="All bookings" />
    {loading ? <Skeleton className="h-40 rounded-xl" /> : error ? <ErrorState message={error} onRetry={retry} /> : bookings.length === 0 ? <EmptyState title="No upcoming stays" body="Your confirmed upcoming bookings will appear here." /> : <ul className="dashboard-bookings">
      {bookings.slice(0, 2).map(booking => <li key={booking.id}><Link href={`/bookings?b=${booking.id}`} className="dashboard-booking focusable">
        <div className="dashboard-booking-photo">{booking.photo ? <Photo src={booking.photo} alt={booking.listingTitle} className="size-full" sizes="148px" /> : <Building2 aria-label="No property photo" />}</div>
        <div className="dashboard-booking-copy"><div className="dashboard-booking-title"><strong>{booking.guestName || "Guest"}</strong><span className="dashboard-status"><i />{booking.statusLabel}</span></div>
          <p className="dashboard-booking-property">{booking.listingTitle}</p><p><CalendarDays size={18} aria-hidden />{day(booking.startsOn)} – {day(booking.endsOn)}</p><p><Moon size={18} aria-hidden />{booking.nights} {booking.nights === 1 ? "night" : "nights"}</p>
        </div>
      </Link></li>)}
    </ul>}
  </section>;
}
export function RecentMessagesPanel({ conversations, loading, error, retry }: { conversations: readonly Conversation[]; loading: boolean; error: string | null; retry: () => void }) {
  const recent = recentConversations(conversations);
  return <section className="dashboard-panel"><PanelHeading title="Recent messages" href="/messages" action="Inbox" />
    {loading ? <Skeleton className="h-64 rounded-xl" /> : error ? <ErrorState message={error} onRetry={retry} /> : recent.length === 0 ? <EmptyState title="No messages yet" body="Your customer conversations will appear here." /> : <ul className="dashboard-conversations">
      {recent.map(conversation => <li key={conversation.id}><Link className="dashboard-conversation focusable" href={`/messages?c=${conversation.id}`}>
        <span className="dashboard-unread-dot" data-unread={conversation.unreadCount > 0} aria-label={conversation.unreadCount > 0 ? "Unread" : undefined} />
        <span className="dashboard-avatar" aria-hidden>{conversation.customerName.slice(0, 1).toUpperCase() || "G"}</span>
        <span className="dashboard-conversation-copy"><strong>{conversation.customerName || "Guest"}</strong><span>{conversation.lastMessagePreview || "No message preview"}</span></span>
        <span className="dashboard-conversation-meta"><time dateTime={conversation.lastMessageAt!}>{timestamp(conversation.lastMessageAt!)}</time>{conversation.unreadCount > 0 ? <span className="dashboard-unread-count" aria-label={`${conversation.unreadCount} unread messages`}>{conversation.unreadCount}</span> : null}</span>
      </Link></li>)}
    </ul>}
  </section>;
}
