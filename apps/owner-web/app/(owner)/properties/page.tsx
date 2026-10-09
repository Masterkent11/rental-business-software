"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Building2, ImageOff, Plus, Rotate3d, Search } from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import {
  Badge,
  Btn,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LinkBtn,
  SegmentedTabs,
  SkeletonRows,
} from "@/components/owner/ui";
import { peso } from "@/lib/money";
import { Photo } from "@/components/owner/photo";
import { useListingsStore, type ListingFilter } from "@/stores/use-listings-store";
import { useSessionStore } from "@/stores/use-session-store";
import {
  LISTING_STATE_LABEL,
  allowedActions,
  propertyTypeLabel,
  type ListingAction,
  type OwnerListing,
} from "@/domain/listings/listing";

const stateTone = (state: OwnerListing["state"]) =>
  state === "PUBLISHED" ? "ok" : state === "DRAFT" ? "pending" : state === "REJECTED" ? "bad" : "neutral";

const actionCopy: Record<ListingAction, { label: string; title: string; body: string; tone: "primary" | "danger" }> = {
  PUBLISH: {
    label: "Publish",
    title: "Publish this listing?",
    body: "It becomes visible to customers in the app right away.",
    tone: "primary",
  },
  UNPUBLISH: {
    label: "Unpublish",
    title: "Take this listing off the market?",
    body: "Customers stop seeing it. Existing bookings and conversations are kept.",
    tone: "danger",
  },
  ARCHIVE: {
    label: "Archive",
    title: "Archive this listing?",
    body: "It disappears from your list. Booking history is kept. This can't be undone from the workspace.",
    tone: "danger",
  },
};

export default function PropertiesPage() {
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const {
    listings,
    loading,
    loaded,
    error,
    filter,
    query,
    busyId,
    pending,
    actionError,
    load,
    setFilter,
    setQuery,
    askToConfirm,
    cancelConfirm,
    runAction,
  } = useListingsStore();

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId, load]);

  const text = query.trim().toLowerCase();
  const visible = listings.filter(
    (l) =>
      (filter === "ALL" || l.state === filter) &&
      (!text || `${l.title} ${l.propertyName} ${l.areaLabel} ${l.cityLabel}`.toLowerCase().includes(text)),
  );
  const count = (state: ListingFilter) => (state === "ALL" ? listings.length : listings.filter((l) => l.state === state).length);

  return (
    <Page>
      <TopBar title="Properties" caption="Everything you list on the marketplace, in one place.">
        <div className="flex flex-wrap gap-2">
          <LinkBtn href="/properties/new?intent=sale" variant="outline">
            <Plus className="size-4" aria-hidden /> Property for sale
          </LinkBtn>
          <LinkBtn href="/properties/new">
            <Plus className="size-4" aria-hidden /> Rental
          </LinkBtn>
        </div>
      </TopBar>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs<ListingFilter>
          label="Filter by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All", count: count("ALL") },
            { value: "PUBLISHED", label: "Published", count: count("PUBLISHED") },
            { value: "DRAFT", label: "Drafts", count: count("DRAFT") },
            { value: "UNPUBLISHED", label: "Unpublished", count: count("UNPUBLISHED") },
          ]}
        />
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search properties</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or area"
            className="focusable h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13.5px]"
          />
        </label>
      </div>

      <Card>
        {loading && !loaded ? (
          <SkeletonRows rows={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => organizationId && void load(organizationId)} />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-5" aria-hidden />}
            title="No properties yet"
            body="Add your first property with photos, pricing and availability. It stays a draft until you publish it."
            action={
              <LinkBtn href="/properties/new">
                <Plus className="size-4" aria-hidden /> Add a property
              </LinkBtn>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing matches" body="Try another status or search term." />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((listing) => (
              <li key={listing.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                <Link href={`/properties/${listing.id}`} className="focusable flex min-w-0 flex-1 items-center gap-4 rounded-xl">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                    {listing.photos[0] ? (
                      <Photo src={listing.photos[0]} alt="" className="size-full" sizes="64px" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted">
                        <ImageOff className="size-5" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold">{listing.title}</p>
                      <Badge tone={stateTone(listing.state)}>{LISTING_STATE_LABEL[listing.state]}</Badge>
                      {listing.intent === "SALE" ? <Badge tone="dark">For sale</Badge> : null}
                      {listing.hasTour ? (
                        <Badge tone="info">
                          <Rotate3d className="size-3" aria-hidden /> Tour
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      {propertyTypeLabel(listing.propertyType, listing.intent)} · {listing.propertyName} · {listing.areaLabel}, {listing.cityLabel}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {listing.intent === "SALE" || listing.priceCentavos === null ? (
                        <span className="font-semibold text-foreground">Price on inquiry</span>
                      ) : (
                        <>
                          <span className="tabular font-semibold text-foreground">{peso(listing.priceCentavos)}</span>
                          {listing.kind === "SHORT_TERM" ? " / night" : " / month"}
                        </>
                      )}{" "}
                      · {listing.photos.length} photo
                      {listing.photos.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                  {allowedActions(listing.state).map((action) => (
                    <Btn
                      key={action}
                      size="sm"
                      variant={action === "PUBLISH" ? "primary" : "outline"}
                      busy={busyId === listing.id}
                      onClick={() => askToConfirm(listing, action)}
                    >
                      {actionCopy[action].label}
                    </Btn>
                  ))}
                  <LinkBtn href={`/properties/${listing.id}`} size="sm" variant="ghost">
                    Edit
                  </LinkBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={pending !== null}
        title={pending ? actionCopy[pending.action].title : ""}
        body={pending ? actionCopy[pending.action].body : ""}
        confirmLabel={pending ? actionCopy[pending.action].label : ""}
        tone={pending ? actionCopy[pending.action].tone : "primary"}
        busy={pending !== null && busyId === pending.listing.id}
        error={actionError}
        onCancel={cancelConfirm}
        onConfirm={() => pending && organizationId && void runAction(organizationId, pending.listing, pending.action)}
      />
    </Page>
  );
}
