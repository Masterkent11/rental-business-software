"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, ChevronLeft, ChevronRight, MessageSquare, Search, Users, X } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  ErrorState,
  InlineError,
  LinkBtn,
  SegmentedTabs,
  Skeleton,
  SkeletonRows,
} from "@/components/owner/ui";
import { Photo } from "@/components/owner/photo";
import { formatDate, formatDateTime, peso } from "@/lib/money";
import { BOOKINGS_PAGE_SIZE, useBookingsStore } from "@/stores/use-bookings-store";
import { useSessionStore } from "@/stores/use-session-store";
import { useNotificationsStore } from "@/stores/use-notifications-store";
import { BOOKING_BUCKETS, type BookingBucket, type OwnerBooking } from "@/domain/bookings/booking";

const bucketTone = (bucket: OwnerBooking["bucket"]) =>
  bucket === "UPCOMING" ? "info" : bucket === "CURRENT" ? "ok" : bucket === "PENDING_PAYMENT" ? "pending" : bucket === "CANCELLED" ? "bad" : "neutral";

function BookingDetail({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
  const { selected: storedSelected, organizationId: loadedOrganizationId, selectedLoading,
    selectedError: storedError, actionBusy, actionError: storedActionError, act } = useBookingsStore();
  const matches = loadedOrganizationId === organizationId;
  const selected = matches ? storedSelected : null;
  const selectedError = matches ? storedError : null;
  const actionError = matches ? storedActionError : null;
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl" aria-label="Booking details">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-[15px] font-semibold">Booking {selected ? `#${selected.reference}` : ""}</p>
        <button onClick={onClose} aria-label="Close booking details" className="focusable rounded-lg p-2 text-muted hover:bg-surface-secondary">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {selectedLoading && !selected ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : selectedError ? (
          <ErrorState message={selectedError} />
        ) : selected ? (
          <div className="flex flex-col gap-5">
            {selected.photo ? <Photo src={selected.photo} alt="" className="aspect-[16/9] w-full rounded-2xl" sizes="420px" /> : null}
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={bucketTone(selected.bucket)}>{selected.statusLabel}</Badge>
              </div>
              <h2 className="mt-2 text-[17px] font-semibold tracking-tight">{selected.listingTitle}</h2>
              <p className="text-[13px] text-muted">{selected.propertyName} · {selected.resourceLabel} · {selected.areaLabel}, {selected.cityLabel}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-2xl bg-surface-secondary/60 p-4 text-[13px]">
              <div><dt className="text-muted">Check-in</dt><dd className="font-semibold">{formatDate(selected.startsOn)}</dd></div>
              <div><dt className="text-muted">Check-out</dt><dd className="font-semibold">{formatDate(selected.endsOn)}</dd></div>
              <div><dt className="text-muted">Nights</dt><dd className="font-semibold tabular">{selected.nights}</dd></div>
              <div><dt className="text-muted">Guests</dt><dd className="font-semibold tabular">{selected.guests ?? "—"}</dd></div>
            </dl>
            <div>
              <p className="text-[12.5px] font-semibold text-muted">Guest</p>
              <p className="mt-1 text-[14px] font-semibold">{selected.guestName}</p>
              {selected.guestEmail ? <p className="text-[13px] text-muted">{selected.guestEmail}</p> : null}
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-muted">Payment</p>
              {selected.paidCentavos > 0 ? (
                <p className="mt-1 text-[14px]">
                  <span className="tabular font-semibold">{peso(selected.paidCentavos)}</span>{" "}
                  <span className="text-muted">paid{selected.paidAt ? ` ${formatDateTime(selected.paidAt)}` : ""} · sandbox</span>
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-muted">
                  Not paid yet{selected.holdExpiresAt ? ` · dates held until ${formatDateTime(selected.holdExpiresAt)}` : ""}
                </p>
              )}
            </div>
            <InlineError message={actionError} />
          </div>
        ) : null}
      </div>
      {selected ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
          {selected.allowedActions.includes("CHECK_IN") ? (
            <Btn busy={actionBusy} onClick={() => void act(organizationId, "CHECK_IN")}>Check in guest</Btn>
          ) : null}
          {selected.allowedActions.includes("COMPLETE") ? (
            <Btn busy={actionBusy} onClick={() => void act(organizationId, "COMPLETE")}>Mark as completed</Btn>
          ) : null}
          {selected.conversationId ? (
            <LinkBtn href={`/messages?c=${selected.conversationId}`} variant="outline">
              <MessageSquare className="size-4" aria-hidden /> Open conversation
            </LinkBtn>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function Bookings() {
  const router = useRouter();
  const search = useSearchParams();
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { items: storedItems, total: storedTotal, organizationId: loadedOrganizationId,
    bucket, query, page, loading: storeLoading, loaded: storeLoaded, error: storedError,
    load, setBucket, setQuery, search: runSearch, goToPage, select } = useBookingsStore();
  const matches = loadedOrganizationId === organizationId;
  const items = matches ? storedItems : [];
  const total = matches ? storedTotal : 0;
  const loading = !matches || storeLoading;
  const loaded = matches && storeLoaded;
  const error = matches ? storedError : null;
  const selectedId = search.get("b");
  const requestedBucket = search.get("bucket");
  const latest = useNotificationsStore((s) => s.latest);

  useEffect(() => {
    if (organizationId && latest && (latest.kind === "BOOKING_RECEIVED" || latest.kind === "BOOKING_UPDATED")) {
      void load(organizationId);
    }
  }, [latest, organizationId, load]);

  useEffect(() => {
    if (!organizationId) return;
    const desired = requestedBucket === "UPCOMING" ? "UPCOMING" : "ALL";
    if (useBookingsStore.getState().bucket !== desired) void setBucket(organizationId, desired);
    else void load(organizationId);
  }, [organizationId, requestedBucket, load, setBucket]);

  useEffect(() => {
    if (organizationId) void select(organizationId, selectedId);
  }, [organizationId, selectedId, select]);

  const pages = Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE));

  return (
    <Page>
      <TopBar title="Bookings" caption="Every stay booked through the customer app, newest arrivals first." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs<BookingBucket | "ALL">
          label="Filter bookings"
          value={bucket}
          onChange={(value) => organizationId && void setBucket(organizationId, value)}
          options={BOOKING_BUCKETS}
        />
        <form
          className="relative w-full sm:w-72"
          onSubmit={(event) => {
            event.preventDefault();
            if (organizationId) void runSearch(organizationId);
          }}
        >
          <label className="sr-only" htmlFor="booking-search">Search bookings</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="booking-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Guest or listing, then Enter"
            className="focusable h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13.5px]"
          />
        </form>
      </div>
      <Card>
        {loading && !loaded ? (
          <SkeletonRows />
        ) : error ? (
          <ErrorState message={error} onRetry={() => organizationId && void load(organizationId)} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="size-5" aria-hidden />}
            title={bucket === "ALL" && !query ? "No bookings yet" : "No bookings match"}
            body={bucket === "ALL" && !query ? "When a customer books one of your nightly listings it appears here instantly." : "Try another filter or clear the search."}
            action={bucket === "ALL" && !query ? <LinkBtn href="/properties" variant="outline">View properties</LinkBtn> : undefined}
          />
        ) : (
          <ul className={loading ? "divide-y divide-border opacity-60" : "divide-y divide-border"}>
            {items.map((booking) => (
              <li key={booking.id}>
                <Link
                  href={`/bookings?b=${booking.id}`}
                  scroll={false}
                  className="focusable flex items-center gap-4 px-4 py-4 transition-colors hover:bg-surface-secondary/50 sm:px-5"
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                    {booking.photo ? <Photo src={booking.photo} alt="" className="size-full" sizes="56px" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14px] font-semibold">{booking.guestName}</p>
                      <Badge tone={bucketTone(booking.bucket)}>{booking.statusLabel}</Badge>
                    </div>
                    <p className="truncate text-[12.5px] text-muted">{booking.listingTitle}</p>
                    <p className="text-[12.5px] text-muted">
                      {formatDate(booking.startsOn)} → {formatDate(booking.endsOn)} · {booking.nights} night{booking.nights === 1 ? "" : "s"}
                      {booking.guests ? <> · <Users className="inline size-3" aria-hidden /> {booking.guests}</> : null}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="tabular text-[14px] font-semibold">{booking.paidCentavos > 0 ? peso(booking.paidCentavos) : "—"}</p>
                    <p className="text-[11.5px] text-muted">#{booking.reference}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {total > BOOKINGS_PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-end gap-2 text-[13px] text-muted">
          <span>Page {page + 1} of {pages}</span>
          <Btn size="sm" variant="outline" disabled={page === 0} onClick={() => organizationId && void goToPage(organizationId, page - 1)} aria-label="Previous page">
            <ChevronLeft className="size-4" aria-hidden />
          </Btn>
          <Btn size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => organizationId && void goToPage(organizationId, page + 1)} aria-label="Next page">
            <ChevronRight className="size-4" aria-hidden />
          </Btn>
        </div>
      ) : null}
      {selectedId && organizationId ? (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => router.push("/bookings", { scroll: false })} />
          <BookingDetail organizationId={organizationId} onClose={() => router.push("/bookings", { scroll: false })} />
        </>
      ) : null}
    </Page>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <Bookings />
    </Suspense>
  );
}
