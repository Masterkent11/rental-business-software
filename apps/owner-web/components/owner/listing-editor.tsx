"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  BedDouble,
  CalendarX2,
  CheckCircle2,
  FileImage,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  RotateCw,
  Search,
  Star,
  Trash2,
  UserPlus,
  Users,
  View,
} from "lucide-react";

import { Page, TopBar } from "@/components/owner/shell";
import {
  Badge,
  Btn,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  InlineError,
  LinkBtn,
  SegmentedTabs,
  Skeleton,
  TextInput,
} from "@/components/owner/ui";
import {
  DetailsSection,
  LocationSection,
  PricingSection,
  PrivateTermsSection,
  SaleDetailsSection,
  TypeSection,
} from "@/components/owner/listing-form";
import { Photo } from "@/components/owner/photo";
import { peso } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  canEditListing,
  canSeeTerms,
  useListingEditorStore,
  type EditorTab,
} from "@/stores/use-listing-editor-store";
import { useListingsStore } from "@/stores/use-listings-store";
import { currentFor, useRepresentationStore } from "@/stores/use-representation-store";
import { useSessionStore } from "@/stores/use-session-store";
import {
  LISTING_STATE_LABEL,
  MAX_FLOOR_PLANS,
  MAX_PHOTOS,
  allowedActions,
  mapEmbedUrl,
  propertyTypeLabel,
  saleStatusLabel,
  type AgentPermissions,
  type CalendarNight,
  type OwnerListing,
} from "@/domain/listings/listing";
import { PERMISSION_LABEL } from "@/domain/agents/agent";
import type { PartnerScope } from "@/domain/workspace/workspace";

const FLOOR_PLAN_LABELS = ["Ground floor", "Second floor", "Third floor", "Lot plan", "Unit layout"];

export function editorTabs(scope: PartnerScope, listing: OwnerListing): { value: EditorTab; label: string; count?: number }[] {
  const owner = scope.kind === "OWNER";
  const sale = listing.intent === "SALE";
  const tabs: { value: EditorTab; label: string; count?: number }[] = [{ value: "details", label: "Details" }];
  tabs.push({ value: "photos", label: "Photos", count: listing.media.length });
  if (sale) tabs.push({ value: "plans", label: "Floor plans", count: listing.floorPlans.length });
  if (!sale && owner) tabs.push({ value: "pricing", label: "Pricing" });
  if (sale && canSeeTerms(scope, listing)) tabs.push({ value: "terms", label: "Private terms" });
  if (!sale && owner) tabs.push({ value: "availability", label: "Availability" });
  if (owner) tabs.push({ value: "agent", label: "Agent" });
  tabs.push({ value: "publish", label: listing.state === "PUBLISHED" || !owner ? "Status" : "Preview & publish" });
  return tabs;
}

const mayEditDetails = (scope: PartnerScope, listing: OwnerListing) =>
  scope.kind === "OWNER" || (listing.intent === "SALE" && canEditListing(scope, listing));

function SaveBar() {
  const { saving, saveError, savedAt } = useListingEditorStore();
  return (
    <>
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
    </>
  );
}

function ReadOnlyDetails({ listing }: { listing: OwnerListing }) {
  const rows: [string, string][] = [
    ["Type", propertyTypeLabel(listing.propertyType, listing.intent)],
    ["Address", [listing.addressLine, listing.areaLabel, listing.cityLabel].filter(Boolean).join(", ")],
    ["Bedrooms", String(listing.bedrooms)],
    ["Bathrooms", String(listing.bathrooms)],
    ["Floor area", listing.floorAreaSqm ? `${listing.floorAreaSqm} m²` : "Not set"],
  ];
  if (listing.intent === "SALE") {
    rows.push(["Status", saleStatusLabel(listing.saleStatus)]);
    rows.push(["Lot area", listing.lotAreaSqm ? `${listing.lotAreaSqm} m²` : "Not set"]);
    rows.push(["Parking", String(listing.parkingSlots)]);
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-secondary/60 px-4 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <p className="text-[13px] text-muted">The owner manages these details. Ask them to allow listing edits if you need to change anything.</p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[12px] font-medium text-muted">{label}</dt>
            <dd className="text-[13.5px]">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="text-[12px] font-medium text-muted">Description</p>
        <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed">{listing.description || "No description yet."}</p>
      </div>
    </div>
  );
}

function DetailsTab({ scope }: { scope: PartnerScope }) {
  const { listing, saveDetails, tab } = useListingEditorStore();
  if (!listing) return null;
  if (!mayEditDetails(scope, listing)) return <ReadOnlyDetails listing={listing} />;
  const sale = listing.intent === "SALE";
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void saveDetails();
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
            <h2 className="mb-4 text-[15px] font-semibold">{sale ? "Property details" : "Description & amenities"}</h2>
            {sale ? <SaleDetailsSection /> : <DetailsSection />}
          </section>
        </>
      ) : tab === "terms" ? (
        <section>
          <h2 className="mb-4 text-[15px] font-semibold">Private commercial terms</h2>
          <PrivateTermsSection />
        </section>
      ) : (
        <section>
          <h2 className="mb-4 text-[15px] font-semibold">Pricing & terms</h2>
          <PricingSection />
        </section>
      )}
      <SaveBar />
    </form>
  );
}

function TermsTab({ scope }: { scope: PartnerScope }) {
  const { listing, termsError } = useListingEditorStore();
  if (!listing) return null;
  if (termsError) return <ErrorState message={termsError} />;
  if (mayEditDetails(scope, listing)) return <DetailsTab scope={scope} />;
  return <PrivateTermsSection readOnly />;
}

function PhotosTab({ scope }: { scope: PartnerScope }) {
  const input = useRef<HTMLInputElement>(null);
  const { listing, uploads, photoError, photoBusyId, addPhotos, retryUpload, dismissUpload, removePhoto, makeCover, movePhoto } =
    useListingEditorStore();
  if (!listing) return null;
  const editable = canEditListing(scope, listing);
  const total = listing.media.length + uploads.length;

  return (
    <div className="flex flex-col gap-5">
      {editable ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addPhotos(Array.from(event.dataTransfer.files));
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
              void addPhotos(files);
            }}
          />
          <Btn type="button" variant="outline" className="mt-4" onClick={() => input.current?.click()} disabled={total >= MAX_PHOTOS}>
            Choose photos
          </Btn>
        </div>
      ) : null}
      <InlineError message={photoError} />

      {listing.media.length === 0 && uploads.length === 0 ? (
        <p className="text-center text-[13px] text-muted">
          {editable ? "Listings need at least one photo before they can be published. The first photo is the cover." : "No photos yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listing.media.map((photo, index) => (
            <li key={photo.id} className="group relative overflow-hidden rounded-2xl border border-border bg-surface">
              <Photo src={photo.url} alt={`Photo ${index + 1}`} className="aspect-[4/3] w-full" sizes="(max-width: 768px) 50vw, 25vw" />
              {index === 0 ? (
                <span className="absolute left-2 top-2">
                  <Badge tone="dark">
                    <Star className="size-3" aria-hidden /> Cover
                  </Badge>
                </span>
              ) : null}
              {photoBusyId === photo.id ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                </div>
              ) : null}
              {editable ? (
                <div className="flex items-center justify-between gap-1 p-2">
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move earlier" disabled={index === 0 || photoBusyId !== null} onClick={() => void movePhoto(photo.id, -1)} className="focusable rounded-lg p-1.5 text-muted hover:bg-surface-secondary hover:text-foreground disabled:opacity-30">
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label="Move later" disabled={index === listing.media.length - 1 || photoBusyId !== null} onClick={() => void movePhoto(photo.id, 1)} className="focusable rounded-lg p-1.5 text-muted hover:bg-surface-secondary hover:text-foreground disabled:opacity-30">
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                    {index > 0 ? (
                      <button type="button" onClick={() => void makeCover(photo.id)} disabled={photoBusyId !== null} className="focusable rounded-lg px-2 py-1 text-[12px] font-medium text-muted hover:bg-surface-secondary hover:text-foreground">
                        Make cover
                      </button>
                    ) : null}
                  </div>
                  <button type="button" aria-label="Remove photo" disabled={photoBusyId !== null} onClick={() => void removePhoto(photo.id)} className="focusable rounded-lg p-1.5 text-muted hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}
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
                      <Btn size="sm" variant="outline" onClick={() => void retryUpload(upload.key)}>
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

function FloorPlansTab({ scope }: { scope: PartnerScope }) {
  const input = useRef<HTMLInputElement>(null);
  const { listing, planLabel, planProgress, planError, planBusyId, setPlanLabel, addFloorPlan, removeFloorPlan } = useListingEditorStore();
  if (!listing) return null;
  const editable = canEditListing(scope, listing);
  const full = listing.floorPlans.length >= MAX_FLOOR_PLANS;

  return (
    <div className="flex flex-col gap-6">
      {editable ? (
        <Card className="p-5">
          <h3 className="text-[14px] font-semibold">Add a floor plan</h3>
          <p className="mt-1 text-[12.5px] text-muted">Upload a clear plan image for each level or the lot. JPEG, PNG or WebP · up to 10 MB.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Plan name" htmlFor="planLabel" className="flex-1">
              <TextInput id="planLabel" value={planLabel} onChange={(e) => setPlanLabel(e.target.value)} placeholder="Ground floor" maxLength={60} />
            </Field>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choose floor plan image"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void addFloorPlan(file);
              }}
            />
            <Btn type="button" onClick={() => input.current?.click()} disabled={full || planProgress !== null || !planLabel.trim()} busy={planProgress !== null}>
              <FileImage className="size-4" aria-hidden /> Choose image
            </Btn>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLOOR_PLAN_LABELS.filter((label) => !listing.floorPlans.some((p) => p.label === label)).map((label) => (
              <button key={label} type="button" onClick={() => setPlanLabel(label)} className="focusable rounded-full border border-border px-3 py-1 text-[12px] text-muted hover:border-foreground/30 hover:text-foreground">
                {label}
              </button>
            ))}
          </div>
          {planProgress !== null ? (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-secondary" role="progressbar" aria-valuenow={Math.round(planProgress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Uploading floor plan">
              <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${Math.max(4, planProgress * 100)}%` }} />
            </div>
          ) : null}
          <div className="mt-3">
            <InlineError message={planError} />
          </div>
          {full ? <p className="mt-3 text-[12.5px] text-muted">You have reached {MAX_FLOOR_PLANS} floor plans. Remove one to add another.</p> : null}
        </Card>
      ) : null}
      {listing.floorPlans.length === 0 ? (
        <EmptyState icon={<FileImage className="size-5" aria-hidden />} title="No floor plans yet" body="Buyers see floor plans in the Floor Plan tab of the listing." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {listing.floorPlans.map((plan) => (
            <li key={plan.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="relative bg-white">
                <Photo src={plan.url} alt={plan.label} className="aspect-[4/3] w-full object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                {planBusyId === plan.id ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13.5px] font-medium">{plan.label}</span>
                {editable ? (
                  <Btn size="sm" variant="ghost" onClick={() => void removeFloorPlan(plan.id)} disabled={planBusyId !== null} aria-label={`Remove ${plan.label}`}>
                    <Trash2 className="size-4" aria-hidden /> Remove
                  </Btn>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const nightTone = (status: CalendarNight["status"]) =>
  status === "OPEN" ? "bg-surface text-foreground" : status === "BLOCKED" ? "bg-surface-tertiary text-muted line-through" : "bg-foreground text-white";

function AvailabilityTab() {
  const { listing, nights, blocks, calendarFrom, calendarLoading, calendarError, blockStart, blockEnd, blockNote, blockBusy, loadCalendar, setBlockField, addBlock, removeBlock } =
    useListingEditorStore();

  const listingId = listing?.id;
  useEffect(() => {
    if (listingId) void loadCalendar();
  }, [listingId, loadCalendar]);

  if (!listing) return null;
  const shift = (months: number) => {
    const date = new Date(`${calendarFrom}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + months);
    void loadCalendar(date.toISOString().slice(0, 10));
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
            void addBlock();
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
                <Btn size="sm" variant="ghost" onClick={() => void removeBlock(block.id)} disabled={blockBusy}>
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

function PermissionToggles({
  value,
  onChange,
  disabled,
}: {
  value: AgentPermissions;
  onChange: (key: keyof AgentPermissions, next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {(Object.keys(PERMISSION_LABEL) as (keyof AgentPermissions)[]).map((key) => (
        <li key={key}>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3.5 py-2.5 hover:bg-surface-secondary/50">
            <input type="checkbox" className="mt-0.5 size-4 accent-foreground" checked={value[key]} disabled={disabled} onChange={(e) => onChange(key, e.target.checked)} />
            <span className="flex flex-col">
              <span className="text-[13px] font-medium">{PERMISSION_LABEL[key].label}</span>
              <span className="text-[12px] text-muted">{PERMISSION_LABEL[key].hint}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function AgentTab({ organizationId }: { organizationId: string }) {
  const { listing } = useListingEditorStore();
  const {
    items,
    loading,
    error,
    query,
    results,
    searching,
    searchError,
    permissions,
    busy,
    actionError,
    confirmEndId,
    load,
    setQuery,
    search,
    setPermission,
    invite,
    end,
    savePermissions,
    askEnd,
  } = useRepresentationStore();

  useEffect(() => {
    void load(organizationId);
  }, [organizationId, load]);

  if (!listing) return null;
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (error) return <ErrorState message={error} onRetry={() => void load(organizationId)} />;
  const current = currentFor(items, listing.id);

  if (current) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
          <div>
            <p className="text-[14.5px] font-semibold">{current.agentName}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {current.state === "PENDING" ? "Invitation sent. Waiting for the agent to accept." : "Represents this property. Buyers see this agent on the listing."}
            </p>
          </div>
          <Badge tone={current.state === "ACTIVE" ? "ok" : "pending"}>{current.state === "ACTIVE" ? "Active" : "Invited"}</Badge>
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold">What this agent can do</p>
          <PermissionToggles
            value={current.permissions}
            disabled={busy}
            onChange={(key, next) => void savePermissions(current.id, { ...current.permissions, [key]: next })}
          />
        </div>
        <InlineError message={actionError} />
        <div>
          <Btn variant="danger" onClick={() => askEnd(current.id)}>
            {current.state === "PENDING" ? "Cancel invitation" : "End representation"}
          </Btn>
        </div>
        <ConfirmDialog
          open={confirmEndId === current.id}
          title={current.state === "PENDING" ? "Cancel this invitation?" : "End this representation?"}
          body={`${current.agentName} will lose access to this property, its tour and its inquiries. Existing conversations stay in your inbox.`}
          confirmLabel={current.state === "PENDING" ? "Cancel invitation" : "End representation"}
          tone="danger"
          busy={busy}
          error={actionError}
          onConfirm={() => void end(current.id, null)}
          onCancel={() => askEnd(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[15px] font-semibold">Assign an agent</h2>
        <p className="mt-1 text-[13px] text-muted">An agent handles inquiries and viewings for this property. Ownership stays with your organization.</p>
      </div>
      <form
        noValidate
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <TextInput id="agentSearch" aria-label="Search agents" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or area" className="flex-1" />
        <Btn type="submit" variant="outline" busy={searching}>
          <Search className="size-4" aria-hidden /> Search
        </Btn>
      </form>
      <InlineError message={searchError} />
      <div>
        <p className="mb-2 text-[13px] font-semibold">Permissions for the invited agent</p>
        <PermissionToggles value={permissions} onChange={setPermission} disabled={busy} />
      </div>
      <InlineError message={actionError} />
      {results.length > 0 ? (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {results.map((agent) => (
            <li key={agent.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13.5px] font-medium">
                  {agent.displayName}
                  {agent.verified ? <BadgeCheck className="size-4 text-[#1d4ed8]" aria-label="Verified agent" /> : null}
                </p>
                <p className="truncate text-[12px] text-muted">{[agent.headline, agent.areasServed.join(", ")].filter(Boolean).join(" · ")}</p>
              </div>
              <Btn size="sm" busy={busy} onClick={() => void invite(listing.id, agent.id)}>
                <UserPlus className="size-3.5" aria-hidden /> Invite
              </Btn>
            </li>
          ))}
        </ul>
      ) : !searching && query.trim() && results.length === 0 && !searchError ? (
        <p className="text-[13px] text-muted">Search to find agents on the platform.</p>
      ) : null}
    </div>
  );
}

function CustomerPreview({ listing }: { listing: OwnerListing }) {
  const sale = listing.intent === "SALE";
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface">
      {listing.photos[0] ? (
        <Photo src={listing.photos[0]} alt="Cover photo" className="aspect-[16/10] w-full" sizes="(max-width: 1024px) 100vw, 50vw" />
      ) : (
        <div className="flex aspect-[16/10] items-center justify-center bg-surface-secondary text-[13px] text-muted">No cover photo yet</div>
      )}
      <div className="p-5">
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
          {propertyTypeLabel(listing.propertyType, listing.intent)} · {sale ? saleStatusLabel(listing.saleStatus) : listing.kind === "SHORT_TERM" ? "Nightly" : "Monthly"}
        </p>
        <h3 className="mt-1 text-[19px] font-semibold tracking-tight">{listing.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
          <MapPin className="size-3.5" aria-hidden />
          {listing.areaLabel}, {listing.cityLabel}
        </p>
        <div className="mt-3 flex gap-4 text-[12.5px] text-muted">
          {sale ? null : (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {listing.maxOccupants} guests
            </span>
          )}
          <span className="flex items-center gap-1">
            <BedDouble className="size-3.5" aria-hidden />
            {listing.bedrooms} bedroom{listing.bedrooms === 1 ? "" : "s"}
          </span>
        </div>
        {sale || listing.priceCentavos === null ? (
          <p className="mt-4 text-[15px] font-semibold">Price available on inquiry</p>
        ) : (
          <p className="mt-4 text-[18px] font-semibold tabular">
            {peso(listing.priceCentavos)}
            <span className="text-[13px] font-normal text-muted">{listing.kind === "SHORT_TERM" ? " / night" : " / month"}</span>
          </p>
        )}
        <p className="mt-3 line-clamp-4 text-[13.5px] leading-relaxed text-muted">{listing.description || "No description yet."}</p>
      </div>
      {listing.location ? (
        <iframe
          title="Map preview"
          src={mapEmbedUrl(listing.location)}
          className="h-44 w-full border-t border-border"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

function PublishTab({ scope, basePath }: { scope: PartnerScope; basePath: string }) {
  const router = useRouter();
  const replace = useListingsStore((s) => s.replace);
  const { listing, publishing, publishError, publishProblems, changeState, setTab } = useListingEditorStore();
  if (!listing) return null;
  const owner = scope.kind === "OWNER";
  const actions = owner ? allowedActions(listing.state) : [];
  const problems = listing.state === "PUBLISHED" ? [] : publishProblems;

  const run = async (action: "PUBLISH" | "UNPUBLISH" | "ARCHIVE") => {
    const updated = await changeState(action);
    if (!updated) return;
    replace(updated);
    if (action === "ARCHIVE") router.push(basePath);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <p className="mb-3 text-[12.5px] font-semibold text-muted">Customer preview</p>
        <CustomerPreview listing={listing} />
      </div>
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold">Status</p>
            <Badge tone={listing.state === "PUBLISHED" ? "ok" : listing.state === "DRAFT" ? "pending" : "neutral"}>{LISTING_STATE_LABEL[listing.state]}</Badge>
          </div>
          {problems.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-medium">Before {owner ? "you" : "the owner"} can publish:</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {problems.map((problem) => (
                  <li key={problem} className="flex items-start gap-2 text-[13px] text-muted">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                    <span className="first-letter:uppercase">{problem}</span>
                  </li>
                ))}
              </ul>
              {mayEditDetails(scope, listing) ? (
                <div className="mt-3 flex gap-2">
                  <Btn size="sm" variant="outline" onClick={() => setTab("photos")}>
                    Photos
                  </Btn>
                  <Btn size="sm" variant="outline" onClick={() => setTab("details")}>
                    Details
                  </Btn>
                </div>
              ) : null}
            </div>
          ) : listing.state === "PUBLISHED" ? (
            <p className="mt-3 text-[13px] text-muted">Live in the customer app. Saved changes appear there immediately.</p>
          ) : (
            <p className="mt-3 text-[13px] text-muted">Everything needed is in place.</p>
          )}
          {owner ? null : <p className="mt-3 text-[12.5px] text-muted">Only the owner can publish, unpublish or archive this listing.</p>}
          <div className="mt-4">
            <InlineError message={publishError} />
          </div>
          {actions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.includes("PUBLISH") ? (
                <Btn busy={publishing} disabled={problems.length > 0} onClick={() => void run("PUBLISH")}>
                  Publish now
                </Btn>
              ) : null}
              {actions.includes("UNPUBLISH") ? (
                <Btn variant="outline" busy={publishing} onClick={() => void run("UNPUBLISH")}>
                  Unpublish
                </Btn>
              ) : null}
              {actions.includes("ARCHIVE") ? (
                <Btn variant="danger" busy={publishing} onClick={() => void run("ARCHIVE")}>
                  Archive
                </Btn>
              ) : null}
            </div>
          ) : null}
        </Card>
        {listing.intent === "SALE" ? (
          <Card className="p-5">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <Lock className="size-4 text-muted" aria-hidden /> Price privacy
            </p>
            <p className="mt-2 text-[13px] text-muted">
              Buyers never see a price for this listing. They send an inquiry and the price is shared in the conversation.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

const TAB_VALUES: readonly EditorTab[] = ["details", "location", "photos", "plans", "pricing", "terms", "availability", "agent", "publish"];

function Editor({ basePath, toursPath, backLabel }: { basePath: string; toursPath: string; backLabel: string }) {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const scope = useSessionStore((s) => s.scope);
  const { listing, loading, loadError, tab, load, setTab } = useListingEditorStore();
  const listingId = params.id;

  useEffect(() => {
    if (scope && listingId) void load(scope, listingId);
  }, [scope, listingId, load]);

  useEffect(() => {
    const requested = search.get("tab") as EditorTab | null;
    setTab(requested && TAB_VALUES.includes(requested) ? requested : "details");
  }, [search, setTab, listingId]);

  if (!scope) return null;
  if (loading && !listing) {
    return (
      <Page>
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </Page>
    );
  }
  if (loadError && (!listing || listing.id !== listingId)) {
    return (
      <Page>
        <Card>
          <ErrorState message={loadError} onRetry={() => void load(scope, listingId)} />
        </Card>
      </Page>
    );
  }
  if (!listing || listing.id !== listingId) {
    return (
      <Page>
        <Card>
          <EmptyState title="Property not found" body="It may have been archived, or you no longer have access to it." action={<LinkBtn href={basePath}>Back to {backLabel.toLowerCase()}</LinkBtn>} />
        </Card>
      </Page>
    );
  }

  const tabs = editorTabs(scope, listing);
  const activeTab = tabs.some((t) => t.value === tab) ? tab : "details";
  const tourAllowed = scope.kind === "OWNER" || Boolean(listing.permissions?.canManageTour);

  return (
    <Page>
      <LinkBtn href={basePath} variant="ghost" size="sm" className="-ml-2 mb-3">
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </LinkBtn>
      <TopBar title={listing.title} caption={`${listing.propertyName} · ${listing.areaLabel}, ${listing.cityLabel}`}>
        <div className="flex items-center gap-2">
          {listing.intent === "SALE" ? <Badge tone="info">For sale</Badge> : null}
          <Badge tone={listing.state === "PUBLISHED" ? "ok" : listing.state === "DRAFT" ? "pending" : "neutral"}>{LISTING_STATE_LABEL[listing.state]}</Badge>
          {tourAllowed ? (
            <LinkBtn href={`${toursPath}/${listing.id}`} variant="outline" size="sm">
              <View className="size-4" aria-hidden /> Virtual tour
            </LinkBtn>
          ) : null}
        </div>
      </TopBar>
      <div className="mb-5 overflow-x-auto">
        <SegmentedTabs<EditorTab> label="Edit sections" value={activeTab} onChange={setTab} options={tabs} />
      </div>
      <Card className="p-6 sm:p-8">
        {activeTab === "details" || activeTab === "pricing" ? <DetailsTab scope={scope} /> : null}
        {activeTab === "terms" ? <TermsTab scope={scope} /> : null}
        {activeTab === "photos" ? <PhotosTab scope={scope} /> : null}
        {activeTab === "plans" ? <FloorPlansTab scope={scope} /> : null}
        {activeTab === "availability" ? <AvailabilityTab /> : null}
        {activeTab === "agent" && scope.kind === "OWNER" ? <AgentTab organizationId={scope.organizationId} /> : null}
        {activeTab === "publish" ? <PublishTab scope={scope} basePath={basePath} /> : null}
      </Card>
    </Page>
  );
}

export function ListingEditor(props: { basePath: string; toursPath: string; backLabel: string }) {
  return (
    <Suspense fallback={null}>
      <Editor {...props} />
    </Suspense>
  );
}
