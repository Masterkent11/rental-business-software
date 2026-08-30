"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Camera,
  Check,
  ImagePlus,
  MapPin,
  Megaphone,
  Plus,
  Rotate3d,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button, Card, Chip } from "@heroui/react";

import { Page, Panel, TableScroll, TopBar } from "@/components/owner/shell";
import { peso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/use-session-store";
import { useListingsStore } from "@/stores/use-listings-store";

export default function ListingsPage() {
  const activeOrganizationId = useSessionStore((state) => state.activeOrganizationId);

  // Zustand Store Integration
  const {
    listings,
    loading,
    tab,
    search,
    isCreateOpen,
    previewPhoto,
    togglingId,
    setTab,
    setSearch,
    openCreateModal,
    closeCreateModal,
    openPreview,
    closePreview,
    loadListings,
    loadResources,
    togglePublish,
  } = useListingsStore();

  useEffect(() => {
    if (activeOrganizationId) {
      void loadListings(activeOrganizationId);
      void loadResources(activeOrganizationId);
    }
  }, [activeOrganizationId, loadListings, loadResources]);

  const rawListings = listings;

  const filtered = useMemo(() => {
    let list = [...rawListings];
    if (tab === "published") list = list.filter((l) => l.state === "PUBLISHED");
    if (tab === "draft") list = list.filter((l) => l.state !== "PUBLISHED");
    if (tab === "monthly") list = list.filter((l) => l.kind === "LONG_TERM");
    if (tab === "nightly") list = list.filter((l) => l.kind === "SHORT_TERM");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.propertyName.toLowerCase().includes(q) ||
          l.areaLabel.toLowerCase().includes(q) ||
          l.cityLabel.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rawListings, tab, search]);

  const user = useSessionStore((state) => state.user);

  if (loading && rawListings.length === 0) {
    return (
      <>
        <TopBar title="Marketplace Listings" />
        <Page>
          <Panel className="p-8 text-center">
            <div className="inline-block size-6 animate-spin rounded-full border-2 border-accent border-t-transparent mb-3" />
            <p className="text-muted-foreground text-[14px] font-medium">
              Loading marketplace listings…
            </p>
          </Panel>
        </Page>
      </>
    );
  }

  const publishedCount = rawListings.filter((l) => l.state === "PUBLISHED").length;
  const tourCount = rawListings.filter((l) => l.hasTour).length;

  return (
    <>
      <TopBar
        title="Marketplace Listings"
        caption={`${rawListings.length} total listings · ${publishedCount} published live · ${tourCount} with 360° virtual tour`}
      >
        <Button
          size="sm"
          className="rounded-xl shadow-md shadow-accent/20 font-bold px-4 h-9 flex items-center gap-2 bg-accent text-white"
          onClick={openCreateModal}
        >
          <Plus className="size-4" />
          <span>New Listing & Upload Photos</span>
        </Button>
      </TopBar>

      <Page>
        {/* Verification & Publish Status Header */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5 border border-border/80 bg-surface shadow-xs rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="label-caps text-muted-foreground">Organization Gate</span>
              <Chip
                size="sm"
                color="success"
                variant="soft"
                className="font-semibold text-[11px]"
              >
                Verified Active
              </Chip>
            </div>
            <p className="mt-2 text-[17px] font-bold tracking-tight text-foreground">
              {user?.displayName ?? "Owner Portfolio"}
            </p>
            <p className="text-muted-foreground text-[12px] mt-1 leading-relaxed">
              Verified organizations publish live to the public customer app immediately.
            </p>
          </Card>

          <Card className="p-5 border border-border/80 bg-surface shadow-xs rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="label-caps text-muted-foreground">Live Coverage</span>
              <Chip size="sm" color="accent" variant="soft" className="font-semibold text-[11px]">
                {publishedCount} of {rawListings.length} Active
              </Chip>
            </div>
            <p className="mt-2 text-[17px] font-bold tracking-tight text-foreground">
              {rawListings.length > 0 ? Math.round((publishedCount / rawListings.length) * 100) : 0}% Live in Marketplace
            </p>
            <p className="text-muted-foreground text-[12px] mt-1 leading-relaxed">
              Customers can discover, book nightly stays, or apply for monthly tenancies.
            </p>
          </Card>

          <Card className="p-5 border border-border/80 bg-surface shadow-xs rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="label-caps text-muted-foreground">Virtual Tour Impact</span>
              <Chip size="sm" color="success" variant="soft" className="font-semibold text-[11px]">
                {tourCount} 360° Tours
              </Chip>
            </div>
            <p className="mt-2 text-[17px] font-bold tracking-tight text-foreground">
              Interactive 360° Walkthroughs
            </p>
            <p className="text-muted-foreground text-[12px] mt-1 leading-relaxed">
              Listings with virtual tours generate significantly higher viewing conversion.
            </p>
          </Card>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-2 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            <Button
              size="sm"
              variant={tab === "all" ? "primary" : "ghost"}
              className={tab === "all" ? "font-bold rounded-xl shadow-xs" : "text-muted-foreground rounded-xl"}
              onClick={() => setTab("all")}
            >
              All ({rawListings.length})
            </Button>
            <Button
              size="sm"
              variant={tab === "published" ? "primary" : "ghost"}
              className={tab === "published" ? "font-bold rounded-xl shadow-xs" : "text-muted-foreground rounded-xl"}
              onClick={() => setTab("published")}
            >
              Published ({publishedCount})
            </Button>
            <Button
              size="sm"
              variant={tab === "draft" ? "primary" : "ghost"}
              className={tab === "draft" ? "font-bold rounded-xl shadow-xs" : "text-muted-foreground rounded-xl"}
              onClick={() => setTab("draft")}
            >
              Drafts ({rawListings.length - publishedCount})
            </Button>
            <Button
              size="sm"
              variant={tab === "monthly" ? "primary" : "ghost"}
              className={tab === "monthly" ? "font-bold rounded-xl shadow-xs" : "text-muted-foreground rounded-xl"}
              onClick={() => setTab("monthly")}
            >
              Monthly Rentals
            </Button>
            <Button
              size="sm"
              variant={tab === "nightly" ? "primary" : "ghost"}
              className={tab === "nightly" ? "font-bold rounded-xl shadow-xs" : "text-muted-foreground rounded-xl"}
              onClick={() => setTab("nightly")}
            >
              Nightly Stays
            </Button>
          </div>

          <div className="relative min-w-[240px] px-2 md:px-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title, city, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-secondary/60 border border-border/80 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Listings Table */}
        <Card className="rounded-2xl border border-border/80 bg-surface shadow-xs overflow-hidden">
          <TableScroll>
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-border/80 border-b bg-surface-secondary/40 text-muted-foreground">
                  <th className="label-caps px-5 py-3.5 font-bold">Listing & Photos</th>
                  <th className="label-caps px-5 py-3.5 font-bold">Property & Location</th>
                  <th className="label-caps px-5 py-3.5 font-bold">Kind / Unit</th>
                  <th className="label-caps px-5 py-3.5 text-right font-bold">Rate</th>
                  <th className="label-caps px-5 py-3.5 font-bold">360° Tour</th>
                  <th className="label-caps px-5 py-3.5 font-bold">Status</th>
                  <th className="label-caps px-5 py-3.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border/60 divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Megaphone className="size-10 text-muted-foreground/40 mb-3" />
                        <p className="text-[15px] font-bold text-foreground">No listings match your filter</p>
                        <p className="text-[13px] text-muted-foreground mt-1 max-w-sm">
                          Create a new listing and upload photos to publish it directly to the customer app.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          className="mt-4 rounded-xl font-bold"
                          onClick={openCreateModal}
                        >
                          <Plus className="size-4" /> Create Listing
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const isPublished = l.state === "PUBLISHED";
                    const isToggling = togglingId === l.id;
                    const coverPhoto = l.photos?.[0];

                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-surface-secondary/30 transition-colors duration-150 group"
                      >
                        {/* Title & Photo Thumbnail */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => coverPhoto && openPreview(coverPhoto)}
                              className="relative size-14 rounded-xl overflow-hidden bg-surface-secondary border border-border/80 shrink-0 cursor-pointer group-hover:shadow-sm transition-all"
                            >
                              {coverPhoto ? (
                                <Image
                                  src={coverPhoto}
                                  alt={l.title}
                                  fill
                                  unoptimized
                                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-muted-foreground">
                                  <Camera className="size-5 opacity-40" />
                                </div>
                              )}
                              {l.photos?.length > 1 ? (
                                <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                                  +{l.photos.length - 1}
                                </span>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14.5px] font-bold text-foreground truncate max-w-[260px]">
                                {l.title}
                              </p>
                              <p className="text-muted-foreground text-[12px] truncate max-w-[260px] mt-0.5">
                                {l.description || "No description provided"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Property & Location */}
                        <td className="px-5 py-4">
                          <p className="text-[13.5px] font-semibold text-foreground">
                            {l.propertyName}
                          </p>
                          <p className="text-muted-foreground text-[12px] flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-muted-foreground/70" />
                            {l.areaLabel}, {l.cityLabel}
                          </p>
                        </td>

                        {/* Kind & Resource Type */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <Chip
                              size="sm"
                              variant="soft"
                              color={l.kind === "SHORT_TERM" ? "accent" : "default"}
                              className="font-bold text-[11px] h-5"
                            >
                              {l.kind === "SHORT_TERM" ? "Nightly Stay" : "Monthly Rental"}
                            </Chip>
                            <span className="text-muted-foreground text-[11.5px] font-medium">
                              {l.resourceType}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-5 py-4 text-right">
                          <p className="text-amount text-[15px] font-bold text-foreground">
                            {peso(l.priceCentavos)}
                          </p>
                          <p className="text-muted-foreground text-[11px]">
                            {l.kind === "SHORT_TERM" ? "/ night" : "/ month"}
                          </p>
                        </td>

                        {/* 360 Tour */}
                        <td className="px-5 py-4">
                          {l.hasTour ? (
                            <Chip
                              size="sm"
                              variant="soft"
                              color="success"
                              className="font-bold text-[11px] h-5 flex items-center gap-1"
                            >
                              <Rotate3d className="size-3" />
                              <span>{l.sceneCount} Scenes</span>
                            </Chip>
                          ) : (
                            <span className="text-muted-foreground text-[12px] font-medium">
                              Photos only
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <Chip
                            size="sm"
                            variant="soft"
                            color={isPublished ? "success" : "default"}
                            className="font-bold text-[11px] h-6 px-2.5"
                          >
                            {isPublished ? "Published Live" : "Draft / Unlisted"}
                          </Chip>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant={isPublished ? "outline" : "primary"}
                              className={cn(
                                "h-8 rounded-xl font-bold text-[12px] transition-all",
                                isPublished ? "hover:border-rose-500/40 hover:text-rose-600" : "shadow-xs",
                              )}
                              isDisabled={isToggling}
                              onClick={() => activeOrganizationId && togglePublish(activeOrganizationId, l)}
                            >
                              {isToggling ? "Updating…" : isPublished ? "Unpublish" : "Publish"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      </Page>

      {/* Create Listing & Image Uploader Modal */}
      {isCreateOpen && activeOrganizationId ? (
        <CreateListingModal
          organizationId={activeOrganizationId}
          onClose={closeCreateModal}
        />
      ) : null}

      {/* Image Zoom Preview Modal */}
      {previewPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={closePreview}
        >
          <div className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
            <Image
              src={previewPhoto}
              alt="Preview"
              width={1200}
              height={800}
              unoptimized
              className="max-h-[85vh] max-w-[85vw] object-contain"
            />
            <button
              type="button"
              onClick={closePreview}
              className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * Interactive Create Listing Modal with Image Uploader & Zod Validation
 */
function CreateListingModal({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const {
    resources,
    submitting,
    createError,
    formResourceId,
    formKind,
    formTitle,
    formDescription,
    formPricePesos,
    formAdvanceMonths,
    formDepositMonths,
    formMinStayNights,
    formSelectedAmenities,
    formPhotos,
    formValidationError,
    setFormResourceId,
    setFormKind,
    setFormTitle,
    setFormDescription,
    setFormPricePesos,
    setFormAdvanceMonths,
    setFormDepositMonths,
    setFormMinStayNights,
    toggleFormAmenity,
    addFormPhotos,
    removeFormPhoto,
    makeCoverPhoto,
    setFormValidationError,
    submitCreateListing,
  } = useListingsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFormValidationError(null);

    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      if (!file.type.startsWith("image/")) {
        setFormValidationError("Only image files (JPG, PNG, WebP) are supported.");
        continue;
      }
      readers.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        }),
      );
    }

    Promise.all(readers)
      .then((dataUrls) => {
        addFormPhotos(dataUrls);
      })
      .catch(() => {
        setFormValidationError("Could not process one or more images.");
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCreateListing(organizationId);
  };

  const AMENITIES_LIST = [
    "High-speed Fiber WiFi",
    "Inverter Air Conditioning",
    "En-suite Bathroom",
    "Dedicated Workspace",
    "Refrigerator & Kitchen",
    "24/7 Security & CCTV",
    "Backup Generator",
    "Water Heater",
    "Swimming Pool Access",
    "Fitness Gym Access",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-3xl border border-border bg-surface shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-5 bg-surface-secondary/40">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-accent text-white shadow-xs">
              <ImagePlus className="size-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-foreground">Create Marketplace Listing</h2>
              <p className="text-[12.5px] text-muted-foreground font-medium">
                Add resource details, upload high-res photo gallery, and publish live.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-secondary hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {formValidationError || createError ? (
            <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-[13px] text-rose-600 font-semibold">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formValidationError ?? createError}</span>
            </div>
          ) : null}

          {/* Step 1: Select Property Resource */}
          <div className="space-y-2">
            <label className="label-caps text-muted-foreground block">
              1. Choose Property & Resource Unit
            </label>
            {resources.length === 0 ? (
              <p className="text-rose-500 text-[13px] font-medium">
                No active rentable resources found in this organization.
              </p>
            ) : (
              <select
                value={formResourceId || resources[0]?.id}
                onChange={(e) => setFormResourceId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-surface-secondary/70 border border-border text-[13.5px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.propertyName} — {r.label} ({r.resourceType}, {r.areaLabel}, {r.cityLabel})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Step 2: Listing Kind & Basic Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-caps text-muted-foreground block mb-2">
                Rental Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormKind("LONG_TERM")}
                  className={cn(
                    "h-10 rounded-xl border text-[13px] font-bold transition-all",
                    formKind === "LONG_TERM"
                      ? "bg-accent text-white border-accent shadow-xs"
                      : "bg-surface-secondary/50 text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  Monthly Rental
                </button>
                <button
                  type="button"
                  onClick={() => setFormKind("SHORT_TERM")}
                  className={cn(
                    "h-10 rounded-xl border text-[13px] font-bold transition-all",
                    formKind === "SHORT_TERM"
                      ? "bg-accent text-white border-accent shadow-xs"
                      : "bg-surface-secondary/50 text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  Nightly Stay
                </button>
              </div>
            </div>

            <div>
              <label className="label-caps text-muted-foreground block mb-2">
                {formKind === "LONG_TERM" ? "Monthly Rent (PHP)" : "Nightly Rate (PHP)"}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[14px]">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formPricePesos}
                  onChange={(e) => setFormPricePesos(e.target.value)}
                  className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface-secondary/70 border border-border text-[14px] font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="label-caps text-muted-foreground block mb-1.5">
                Marketplace Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Spacious Studio with Balcony & High-Speed WiFi"
                className="w-full h-11 px-3.5 rounded-xl bg-surface-secondary/70 border border-border text-[14px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            <div>
              <label className="label-caps text-muted-foreground block mb-1.5">
                Description & Highlights
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe the unit layout, inclusions, nearby attractions, security, and transportation..."
                className="w-full p-3.5 rounded-xl bg-surface-secondary/70 border border-border text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          {/* Move-in Terms / Stay Rules */}
          {formKind === "LONG_TERM" ? (
            <div className="grid grid-cols-2 gap-4 bg-surface-secondary/30 p-4 rounded-2xl border border-border/80">
              <div>
                <label className="label-caps text-muted-foreground block mb-1">
                  Advance Rent (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={formAdvanceMonths}
                  onChange={(e) => setFormAdvanceMonths(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-[13.5px] font-bold text-foreground"
                />
              </div>
              <div>
                <label className="label-caps text-muted-foreground block mb-1">
                  Security Deposit (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={formDepositMonths}
                  onChange={(e) => setFormDepositMonths(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-[13.5px] font-bold text-foreground"
                />
              </div>
            </div>
          ) : (
            <div className="bg-surface-secondary/30 p-4 rounded-2xl border border-border/80">
              <label className="label-caps text-muted-foreground block mb-1">
                Minimum Stay (Nights)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formMinStayNights}
                onChange={(e) => setFormMinStayNights(e.target.value)}
                className="w-40 h-9 px-3 rounded-xl bg-surface border border-border text-[13.5px] font-bold text-foreground"
              />
            </div>
          )}

          {/* Step 3: Photo Gallery Uploader */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label-caps text-muted-foreground block">
                2. Marketplace Photos & Gallery ({formPhotos.length} uploaded)
              </label>
              <span className="text-[11.5px] text-muted-foreground">
                First photo is the primary cover.
              </span>
            </div>

            {/* Dropzone Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-accent/40 hover:border-accent rounded-2xl bg-accent-soft/10 hover:bg-accent-soft/20 cursor-pointer transition-all duration-200"
            >
              <UploadCloud className="size-8 text-accent mb-2" />
              <p className="text-[13.5px] font-bold text-foreground">
                Click or drag & drop listing photos here
              </p>
              <p className="text-muted-foreground text-[12px] mt-0.5">
                PNG, JPG, WebP supported. Multiple photos allowed.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>

            {/* Photo Preview Grid */}
            {formPhotos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {formPhotos.map((src, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-4/3 rounded-xl overflow-hidden border border-border bg-surface-secondary shadow-xs"
                  >
                    <Image
                      src={src}
                      alt={`Upload ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {idx === 0 ? (
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow-xs">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCoverPhoto(idx)}
                        className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 rounded-md bg-black/70 px-1.5 py-0.5 text-[9.5px] font-bold text-white hover:bg-accent transition-all"
                      >
                        Set Cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFormPhoto(idx)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-rose-600/90 p-1 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition-all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Step 4: Amenities Selection */}
          <div className="space-y-2">
            <label className="label-caps text-muted-foreground block">
              3. Featured Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_LIST.map((name) => {
                const selected = formSelectedAmenities.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleFormAmenity(name)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold border transition-all",
                      selected
                        ? "bg-accent/15 border-accent text-accent font-bold"
                        : "bg-surface-secondary/50 border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {selected ? <Check className="size-3.5" /> : <Plus className="size-3" />}
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="rounded-xl font-bold px-5"
              onClick={onClose}
              isDisabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="rounded-xl font-bold px-6 shadow-md shadow-accent/25"
              isDisabled={submitting}
            >
              {submitting ? "Publishing to Marketplace…" : "Publish Listing Live"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
