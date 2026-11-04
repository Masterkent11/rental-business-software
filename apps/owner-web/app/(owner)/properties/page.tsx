"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Map as MapIcon,
  CircleHelp,
  MapPin,
  House,
  ArrowDownUp,
} from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import {
  Btn,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LinkBtn,
  SegmentedTabs,
  SkeletonRows,
} from "@/components/owner/ui";
import { PropertyRow } from "@/components/owner/property-row";
import {
  useListingsStore,
  type ListingFilter,
} from "@/stores/use-listings-store";
import { useSessionStore } from "@/stores/use-session-store";
import {
  propertyTypeLabel,
  type PropertyType,
  type ListingAction,
  mapEmbedUrl,
} from "@/domain/listings/listing";

import {
  selectProperties,
  type PropertySort,
} from "@/domain/listings/property-filters";

const actionCopy: Record<
  ListingAction,
  { label: string; title: string; body: string; tone: "primary" | "danger" }
> = {
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

function Properties() {
  const search = useSearchParams();
  const requestedState = search.get("state");
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const {
    page,
    pageSize,
    view,
    filtersOpen,
    draftFilters,
    appliedFilters,
    setDraftFilters,
    applyFilters,
    clearFilters,
    mappedId,
    setPresentation,
    listings: storedListings,
    organizationId: loadedOrganizationId,
    loading: storeLoading,
    loaded: storeLoaded,
    error: storedError,
    filter,
    query,
    busyId,
    pending: storedPending,
    actionError: storedActionError,
    load,
    setFilter,
    setQuery,
    askToConfirm,
    cancelConfirm,
    runAction,
  } = useListingsStore();
  const setPage = (page: number) => setPresentation({ page });
  const setPageSize = (pageSize: number) => setPresentation({ pageSize });
  const setView = (view: "list" | "grid" | "map") => setPresentation({ view });
  const setFiltersOpen = (filtersOpen: boolean) =>
    setPresentation({ filtersOpen });
  const setMappedId = (mappedId: string) => setPresentation({ mappedId });
  const matches = loadedOrganizationId === organizationId;
  const listings = matches ? storedListings : [];
  const loading = !matches || storeLoading;
  const loaded = matches && storeLoaded;
  const error = matches ? storedError : null;
  const pending = matches ? storedPending : null;
  const actionError = matches ? storedActionError : null;

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId, load]);

  useEffect(() => {
    setFilter(requestedState === "PUBLISHED" ? "PUBLISHED" : "ALL");
  }, [requestedState, setFilter]);

  const visible = selectProperties(listings, filter, query, appliedFilters);
  const locations = [
    ...new Set(listings.map((listing) => listing.cityLabel).filter(Boolean)),
  ].sort();
  const count = (state: ListingFilter) =>
    state === "ALL"
      ? listings.length
      : listings.filter((l) => l.state === state).length;

  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);
  const offset = (currentPage - 1) * pageSize;
  const paged = visible.slice(offset, offset + pageSize);
  const located = visible.filter((l) => l.location);
  const mapped = located.find((l) => l.id === mappedId) ?? located[0];

  return (
    <div className="properties-page">
      <Page wide>
        <TopBar
          title="Properties"
          caption="Manage your properties, showcase them to tenants, and track their performance."
        >
          <div className="properties-create-actions flex flex-wrap gap-2">
            <LinkBtn href="/properties/new?intent=sale" variant="outline">
              <Plus className="size-4" aria-hidden /> Property for sale
            </LinkBtn>
            <LinkBtn href="/properties/new">
              <Plus className="size-4" aria-hidden /> Rental
            </LinkBtn>
          </div>
        </TopBar>

        <details className="properties-support">
          <summary className="focusable">
            <CircleHelp className="size-4" /> Help &amp; Support
          </summary>
          <div>
            <strong>Managing your properties</strong>
            <p>
              Select a property to edit its photos, price and availability. Use
              its actions menu to publish, unpublish or archive. Search and
              filters narrow the list to your workspace.
            </p>
          </div>
        </details>
        <div className="properties-status">
          <SegmentedTabs<ListingFilter>
            label="Filter by status"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            options={[
              { value: "ALL", label: "All", count: count("ALL") },
              {
                value: "PUBLISHED",
                label: "Published",
                count: count("PUBLISHED"),
              },
              { value: "DRAFT", label: "Drafts", count: count("DRAFT") },
              {
                value: "UNPUBLISHED",
                label: "Unpublished",
                count: count("UNPUBLISHED"),
              },
            ]}
          />
        </div>
        <div className="properties-toolbar">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search properties</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search properties, location, or type..."
              className="focusable h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13.5px]"
            />
          </label>
          <Btn
            variant="outline"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal className="size-4" /> Filters{" "}
            <ChevronDown className="size-4" />
          </Btn>
          <div
            className="properties-view-toggle"
            role="group"
            aria-label="Property display"
          >
            <Btn
              aria-label="List view"
              aria-pressed={view === "list"}
              variant={view === "list" ? "primary" : "outline"}
              onClick={() => setView("list")}
            >
              <List className="size-5" />
            </Btn>
            <Btn
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              variant={view === "grid" ? "primary" : "outline"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
            </Btn>
          </div>
          <Btn
            aria-label="View map"
            aria-pressed={view === "map"}
            className="property-map-button"
            variant={view === "map" ? "primary" : "outline"}
            onClick={() => setView(view === "map" ? "list" : "map")}
          >
            <MapIcon className="size-5" aria-hidden /> <span className="property-map-label">View map</span>
          </Btn>
        </div>
        {filtersOpen && (
          <div className="properties-filters" aria-label="Property filters">
            <label className="property-filter-select">
              <MapPin aria-hidden />
              <span className="sr-only">Location</span>
              <select
                aria-label="Location"
                value={draftFilters.location}
                onChange={(e) => setDraftFilters({ location: e.target.value })}
              >
                <option value="ALL">Location</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden />
            </label>
            <label className="property-filter-select">
              <House aria-hidden />
              <span className="sr-only">Property type</span>
              <select
                aria-label="Property type"
                value={draftFilters.propertyType}
                onChange={(e) =>
                  setDraftFilters({
                    propertyType: e.target.value as PropertyType | "ALL",
                  })
                }
              >
                <option value="ALL">Property type</option>
                {(
                  [
                    "HOUSE",
                    "CONDO",
                    "APARTMENT",
                    "ROOM",
                    "BOARDING_HOUSE",
                    "TOWNHOUSE",
                    "LOT",
                    "COMMERCIAL",
                  ] as const
                ).map((type) => (
                  <option key={type} value={type}>
                    {propertyTypeLabel(type, "SALE")}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden />
            </label>
            <label className="property-filter-select">
              <ArrowDownUp aria-hidden />
              <span className="sr-only">Sort</span>
              <select
                aria-label="Sort"
                value={draftFilters.sort}
                onChange={(e) =>
                  setDraftFilters({ sort: e.target.value as PropertySort })
                }
              >
                <option value="NEWEST">Sort</option>
                <option value="OLDEST">Oldest first</option>
                <option value="TITLE">Name A–Z</option>
                <option value="VIEWS">Most viewed</option>
                <option value="PRICE_ASC">Price: low to high</option>
                <option value="PRICE_DESC">Price: high to low</option>
              </select>
              <ChevronDown aria-hidden />
            </label>
            <div className="property-filter-actions">
              <Btn variant="ghost" onClick={clearFilters}>
                Clear all
              </Btn>
              <Btn onClick={applyFilters}>Apply filters</Btn>
            </div>
          </div>
        )}
        <div
          className="properties-results"
          aria-live="polite"
          aria-busy={loading}
        >
          {loading && !loaded ? (
            <SkeletonRows rows={5} />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => organizationId && void load(organizationId)}
            />
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
            <EmptyState
              title="Nothing matches"
              body="Try another status or search term."
            />
          ) : view === "map" ? (
            <div className="properties-map">
              {mapped?.location ? (
                <>
                  <label>
                    Property location
                    <select
                      aria-label="Map property"
                      value={mapped.id}
                      onChange={(e) => setMappedId(e.target.value)}
                    >
                      {located.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <iframe
                    title={`Location of ${mapped.title}`}
                    src={mapEmbedUrl(mapped.location)}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </>
              ) : (
                <EmptyState
                  title="No mapped properties"
                  body="Add a location when editing a property to display it here."
                />
              )}
            </div>
          ) : (
            <ul className={`properties-list properties-${view}`}>
              {paged.map((listing) => (
                <PropertyRow
                  key={listing.id}
                  listing={listing}
                  busy={busyId !== null}
                  onAction={(action) => askToConfirm(listing, action)}
                />
              ))}
            </ul>
          )}
        </div>
        {loaded && !error && visible.length > 0 && view !== "map" && (
          <footer className="properties-pagination">
            <p>
              Showing {offset + 1}–{Math.min(offset + pageSize, visible.length)}{" "}
              of {visible.length} properties
            </p>
            <nav aria-label="Properties pages">
              <Btn
                variant="outline"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="size-4" />
              </Btn>
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter(
                  (n) =>
                    n === 1 || n === pages || Math.abs(n - currentPage) <= 1,
                )
                .map((n) => (
                  <Btn
                    key={n}
                    aria-current={n === currentPage ? "page" : undefined}
                    variant={n === currentPage ? "primary" : "outline"}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Btn>
                ))}
              <Btn
                variant="outline"
                aria-label="Next page"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight className="size-4" />
              </Btn>
            </nav>
            <select
              aria-label="Properties per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={6}>6 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
            </select>
          </footer>
        )}

        <ConfirmDialog
          open={pending !== null}
          title={pending ? actionCopy[pending.action].title : ""}
          body={pending ? actionCopy[pending.action].body : ""}
          confirmLabel={pending ? actionCopy[pending.action].label : ""}
          tone={pending ? actionCopy[pending.action].tone : "primary"}
          busy={pending !== null && busyId === pending.listing.id}
          error={actionError}
          onCancel={cancelConfirm}
          onConfirm={() =>
            pending &&
            organizationId &&
            void runAction(organizationId, pending.listing, pending.action)
          }
        />
      </Page>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={null}>
      <Properties />
    </Suspense>
  );
}
