"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BedDouble,
  CalendarX2,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  RotateCw,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import {
  Badge,
  Btn,
  Card,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  LinkBtn,
  SegmentedTabs,
  Skeleton,
  TextInput,
} from "@/components/owner/ui";
import { DetailsSection, LocationSection, PricingSection, TypeSection } from "@/components/owner/listing-form";
import { Photo } from "@/components/owner/photo";
import { peso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useListingEditorStore } from "@/stores/use-listing-editor-store";
import { useListingsStore } from "@/stores/use-listings-store";
import { useSessionStore } from "@/stores/use-session-store";
import {
  LISTING_STATE_LABEL,
  MAX_PHOTOS,
  allowedActions,
  propertyTypeLabel,
  type CalendarNight,
} from "@/domain/listings/listing";

type Tab = "details" | "photos" | "pricing" | "availability" | "publish";

function DetailsTab({ organizationId }: { organizationId: string }) {
  const { listing, saving, saveError, savedAt, saveDetails, tab } = useListingEditorStore();
  if (!listing) return null;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void saveDetails(organizationId);
      }}
      className="flex flex-col gap-8"
    >
      {tab === "details" ? (
        <>
          <section>
            <h2 className="mb-4 text-[15px] font-semibold">Type</h2>
            <TypeSection lockMode={listing.state !== "DRAFT"} />
          </section>
          <section>
            <h2 className="mb-4 text-[15px] font-semibold">Location</h2>
            <LocationSection />
          </section>
          <section>
            <h2 className="mb-4 text-[15px] font-semibold">Description & amenities</h2>
            <DetailsSection />
          </section>
        </>
      ) : (
        <section>
          <h2 className="mb-4 text-[15px] font-semibold">Pricing & terms</h2>
          <PricingSection />
        </section>
      )}
      <InlineError message={saveError} />
      <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-3 border-t border-border bg-surface/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        {savedAt && !saving && !saveError ? (
          <span className="flex items-center gap-1.5 text-[12.5px] text-success">
            <CheckCircle2 className="size-4" aria-hidden /> Saved
          </span>
        ) : null}
        <Btn type="submit" busy={saving}>
          Save changes
        </Btn>
      </div>
    </form>
  );
}

function PhotosTab({ organizationId }: { organizationId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { listing, uploads, photoError, photoBusyId, addPhotos, retryUpload, dismissUpload, removePhoto, makeCover, movePhoto } =
    useListingEditorStore();
  if (!listing) return null;
  const total = listing.media.length + uploads.length;

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void addPhotos(organizationId, Array.from(event.dataTransfer.files));
        }}
        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-secondary/40 px-6 py-10 text-center"
      >
        <ImagePlus className="mb-3 size-7 text-muted" aria-hidden />
        <p className="text-[14px] font-semibold">Drag photos here, or choose files</p>
        <p className="mt-1 text-[12.5px] text-muted">JPEG, PNG or WebP · up to 10 MB each · {total}/{MAX_PHOTOS} used</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          aria-label="Choose photos"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void addPhotos(organizationId, files);
          }}
        />
        <Btn type="button" variant="outline" className="mt-4" onClick={() => input.current?.click()} disabled={total >= MAX_PHOTOS}>
          Choose photos
        </Btn>
      </div>
      <InlineError message={photoError} />

      {listing.media.length === 0 && uploads.length === 0 ? (
        <p className="text-center text-[13px] text-muted">Listings need at least one photo before they can be published. The first photo is the cover.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listing.media.map((photo, index) => (
            <li key={photo.id} className="group relative overflow-hidden rounded-2xl border border-border bg-surface">
              <Photo src={photo.url} alt={`Photo ${index + 1}`} className="aspect-[4/3] w-full" sizes="(max-width: 768px) 50vw, 25vw" />
              {index === 0 ? (
                <span className="absolute left-2 top-2"><Badge tone="dark"><Star className="size-3" aria-hidden /> Cover</Badge></span>
              ) : null}
              {photoBusyId === photo.id ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-1 p-2">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move earlier" disabled={index === 0 || photoBusyId !== null} onClick={() => void movePhoto(organizationId, photo.id, -1)} className="focusable rounded-lg p-1.5 text-muted hover:bg-surface-secondary hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button type="button" aria-label="Move later" disabled={index === listing.media.length - 1 || photoBusyId !== null} onClick={() => void movePhoto(organizationId, photo.id, 1)} className="focusable rounded-lg p-1.5 text-muted hover:bg-surface-secondary hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  {index > 0 ? (
                    <button type="button" onClick={() => void makeCover(organizationId, photo.id)} disabled={photoBusyId !== null} className="focusable rounded-lg px-2 py-1 text-[12px] font-medium text-muted hover:bg-surface-secondary hover:text-foreground">
                      Make cover
                    </button>
                  ) : null}
                </div>
                <button type="button" aria-label="Remove photo" disabled={photoBusyId !== null} onClick={() => void removePhoto(organizationId, photo.id)} className="focusable rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
          {uploads.map((upload) => (
            <li key={upload.key} className="relative overflow-hidden rounded-2xl border border-border bg-surface">
              <Photo src={upload.previewUrl} alt={upload.fileName} className="aspect-[4/3] w-full opacity-60" />
              <div className="p-2">
                {upload.status === "uploading" ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary" role="progressbar" aria-valuenow={Math.round(upload.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${upload.fileName}`}>
                      <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${Math.max(4, upload.progress * 100)}%` }} />
                    </div>
                    <span className="truncate text-[11.5px] text-muted">Uploading {Math.round(upload.progress * 100)}%</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-danger">{upload.error}</span>
                    <div className="flex gap-1">
                      <Btn size="sm" variant="outline" onClick={() => void retryUpload(organizationId, upload.key)}>
                        <RotateCw className="size-3.5" aria-hidden /> Retry
                      </Btn>
                      <Btn size="sm" variant="ghost" onClick={() => dismissUpload(upload.key)}>
                        Dismiss
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const nightTone = (status: CalendarNight["status"]) =>
  status === "OPEN"
    ? "bg-surface text-foreground"
    : status === "BLOCKED"
      ? "bg-surface-tertiary text-muted line-through"
      : "bg-foreground text-white";

function AvailabilityTab({ organizationId }: { organizationId: string }) {
  const {
    listing,
    nights,
    blocks,
    calendarFrom,
    calendarLoading,
    calendarError,
    blockStart,
    blockEnd,
    blockNote,
    blockBusy,
    loadCalendar,
    setBlockField,
    addBlock,
    removeBlock,
  } = useListingEditorStore();

  const listingId = listing?.id;
  useEffect(() => {
    if (listingId) void loadCalendar(organizationId);
  }, [listingId, organizationId, loadCalendar]);

  if (!listing) return null;
  const shift = (months: number) => {
    const date = new Date(`${calendarFrom}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + months);
    void loadCalendar(organizationId, date.toISOString().slice(0, 10));
  };
  const months = new Map<string, CalendarNight[]>();
  for (const night of nights) {
    const key = night.night.slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), night]);
  }

  return (
    <div className="flex flex-col gap-6">
      {listing.kind === "LONG_TERM" ? (
        <p className="rounded-xl bg-surface-secondary px-4 py-3 text-[13px] text-muted">
          Monthly listings use the “Available from” date on the Pricing tab. Leases and owner blocks below keep the unit off the market.
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Btn size="sm" variant="outline" onClick={() => shift(-1)} aria-label="Previous month">
            ‹
          </Btn>
          <Btn size="sm" variant="outline" onClick={() => shift(1)} aria-label="Next month">
            ›
          </Btn>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-border bg-surface" />Open</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-foreground" />Booked</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-surface-tertiary" />Blocked</span>
        </div>
      </div>
      <InlineError message={calendarError} />
      {calendarLoading && nights.length === 0 ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className={cn("grid gap-6 md:grid-cols-2", calendarLoading && "opacity-60")}>
          {[...months.entries()].slice(0, 2).map(([month, days]) => {
            const first = new Date(`${month}-01T00:00:00Z`).getUTCDay();
            return (
              <div key={month}>
                <p className="mb-2 text-[13.5px] font-semibold">
                  {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" })}
                </p>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={`${d}-${i}`}>{d}</span>
                  ))}
                  {Array.from({ length: first }).map((_, i) => (
                    <span key={`pad-${i}`} />
                  ))}
                  {days.map((day) => (
                    <span key={day.night} title={`${day.night}: ${day.status.toLowerCase()}`} className={cn("tabular rounded-lg border border-border/60 py-1.5 text-[12px]", nightTone(day.status))}>
                      {Number(day.night.slice(8))}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Card className="p-5">
        <h3 className="text-[14px] font-semibold">Block dates</h3>
        <p className="mt-1 text-[12.5px] text-muted">Blocked nights can&apos;t be booked. Use this for repairs, personal use, or bookings taken elsewhere.</p>
        <form
          noValidate
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void addBlock(organizationId);
          }}
        >
          <Field label="From" htmlFor="blockStart">
            <TextInput id="blockStart" type="date" value={blockStart} onChange={(e) => setBlockField("blockStart", e.target.value)} />
          </Field>
          <Field label="Until (checkout)" htmlFor="blockEnd">
            <TextInput id="blockEnd" type="date" value={blockEnd} onChange={(e) => setBlockField("blockEnd", e.target.value)} />
          </Field>
          <Field label="Note (optional)" htmlFor="blockNote">
            <TextInput id="blockNote" value={blockNote} onChange={(e) => setBlockField("blockNote", e.target.value)} placeholder="Repainting" maxLength={200} />
          </Field>
          <Btn type="submit" busy={blockBusy} disabled={!blockStart || !blockEnd}>
            Block
          </Btn>
        </form>
        {blocks.length > 0 ? (
          <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
            {blocks.map((block) => (
              <li key={block.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span className="flex items-center gap-2">
                  <CalendarX2 className="size-4 text-muted" aria-hidden />
                  {block.startsOn} → {block.endsOn}
                  {block.note ? <span className="text-muted">· {block.note}</span> : null}
                </span>
                <Btn size="sm" variant="ghost" onClick={() => void removeBlock(organizationId, block.id)} disabled={blockBusy}>
                  Reopen
                </Btn>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

function PublishTab({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const replace = useListingsStore((s) => s.replace);
  const { listing, publishing, publishError, publishProblems, changeState, setTab } = useListingEditorStore();
  if (!listing) return null;
  const actions = allowedActions(listing.state);
  const problems = listing.state === "PUBLISHED" ? [] : publishProblems;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <p className="mb-3 text-[12.5px] font-semibold text-muted">Customer preview</p>
        <div className="overflow-hidden rounded-3xl border border-border bg-surface">
          {listing.photos[0] ? (
            <Photo src={listing.photos[0]} alt="Cover photo" className="aspect-[16/10] w-full" sizes="(max-width: 1024px) 100vw, 50vw" />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center bg-surface-secondary text-[13px] text-muted">No cover photo yet</div>
          )}
          <div className="p-5">
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted">{propertyTypeLabel(listing.propertyType)} · {listing.kind === "SHORT_TERM" ? "Nightly" : "Monthly"}</p>
            <h3 className="mt-1 text-[19px] font-semibold tracking-tight">{listing.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-[13px] text-muted"><MapPin className="size-3.5" aria-hidden />{listing.areaLabel}, {listing.cityLabel}</p>
            <div className="mt-3 flex gap-4 text-[12.5px] text-muted">
              <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden />{listing.maxOccupants} guests</span>
              <span className="flex items-center gap-1"><BedDouble className="size-3.5" aria-hidden />{listing.bedrooms} bedroom{listing.bedrooms === 1 ? "" : "s"}</span>
            </div>
            <p className="mt-4 text-[18px] font-semibold tabular">{peso(listing.priceCentavos)}<span className="text-[13px] font-normal text-muted">{listing.kind === "SHORT_TERM" ? " / night" : " / month"}</span></p>
            <p className="mt-3 line-clamp-4 text-[13.5px] leading-relaxed text-muted">{listing.description || "No description yet."}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold">Status</p>
            <Badge tone={listing.state === "PUBLISHED" ? "ok" : listing.state === "DRAFT" ? "pending" : "neutral"}>{LISTING_STATE_LABEL[listing.state]}</Badge>
          </div>
          {problems.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-medium">Before you can publish:</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {problems.map((problem) => (
                  <li key={problem} className="flex items-start gap-2 text-[13px] text-muted">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                    <span className="first-letter:uppercase">{problem}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Btn size="sm" variant="outline" onClick={() => setTab("photos")}>Photos</Btn>
                <Btn size="sm" variant="outline" onClick={() => setTab("details")}>Details</Btn>
              </div>
            </div>
          ) : listing.state === "PUBLISHED" ? (
            <p className="mt-3 text-[13px] text-muted">Live in the customer app. Changes you save appear there immediately.</p>
          ) : (
            <p className="mt-3 text-[13px] text-muted">Everything needed is in place.</p>
          )}
          <div className="mt-4"><InlineError message={publishError} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.includes("PUBLISH") ? (
              <Btn
                busy={publishing}
                disabled={problems.length > 0}
                onClick={async () => {
                  const updated = await changeState(organizationId, "PUBLISH");
                  if (updated) replace(updated);
                }}
              >
                Publish now
              </Btn>
            ) : null}
            {actions.includes("UNPUBLISH") ? (
              <Btn
                variant="outline"
                busy={publishing}
                onClick={async () => {
                  const updated = await changeState(organizationId, "UNPUBLISH");
                  if (updated) replace(updated);
                }}
              >
                Unpublish
              </Btn>
            ) : null}
            {actions.includes("ARCHIVE") ? (
              <Btn
                variant="danger"
                busy={publishing}
                onClick={async () => {
                  const updated = await changeState(organizationId, "ARCHIVE");
                  if (updated) {
                    replace(updated);
                    router.push("/properties");
                  }
                }}
              >
                Archive
              </Btn>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Editor() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const organizationId = useSessionStore((s) => s.activeOrganizationId);
  const { listing, loading, loadError, tab, load, setTab } = useListingEditorStore();
  const listingId = params.id;

  useEffect(() => {
    if (organizationId && listingId) void load(organizationId, listingId);
  }, [organizationId, listingId, load]);

  useEffect(() => {
    const requested = search.get("tab") as Tab | null;
    if (requested) setTab(requested);
  }, [search, setTab]);

  if (!organizationId) return null;
  if (loading && !listing) {
    return (
      <Page>
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </Page>
    );
  }
  if (loadError && !listing) {
    return (
      <Page>
        <Card>
          <ErrorState message={loadError} onRetry={() => void load(organizationId, listingId)} />
        </Card>
      </Page>
    );
  }
  if (!listing || listing.id !== listingId) {
    return (
      <Page>
        <Card>
          <EmptyState title="Property not found" body="It may have been archived or belong to another organization." action={<LinkBtn href="/properties">Back to properties</LinkBtn>} />
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <LinkBtn href="/properties" variant="ghost" size="sm" className="-ml-2 mb-3">
        <ArrowLeft className="size-4" aria-hidden /> Properties
      </LinkBtn>
      <TopBar title={listing.title} caption={`${listing.propertyName} · ${listing.areaLabel}, ${listing.cityLabel}`}>
        <Badge tone={listing.state === "PUBLISHED" ? "ok" : listing.state === "DRAFT" ? "pending" : "neutral"}>{LISTING_STATE_LABEL[listing.state]}</Badge>
      </TopBar>
      <div className="mb-5 overflow-x-auto">
        <SegmentedTabs<Tab>
          label="Edit sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "details", label: "Details" },
            { value: "photos", label: "Photos", count: listing.media.length },
            { value: "pricing", label: "Pricing" },
            { value: "availability", label: "Availability" },
            { value: "publish", label: listing.state === "PUBLISHED" ? "Status" : "Preview & publish" },
          ]}
        />
      </div>
      <Card className="p-6 sm:p-8">
        {tab === "details" || tab === "pricing" ? <DetailsTab organizationId={organizationId} /> : null}
        {tab === "photos" ? <PhotosTab organizationId={organizationId} /> : null}
        {tab === "availability" ? <AvailabilityTab organizationId={organizationId} /> : null}
        {tab === "publish" ? <PublishTab organizationId={organizationId} /> : null}
      </Card>
    </Page>
  );
}

export default function PropertyEditorPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
