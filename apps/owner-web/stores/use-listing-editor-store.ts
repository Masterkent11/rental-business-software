import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type {
  AvailabilityBlock,
  CalendarNight,
  CreatePropertyListingInput,
  OwnerListing,
  SaleTerms,
} from "../domain/listings/listing";
import { floorPlanProblem, photoProblem } from "../domain/listings/listing";
import {
  emptyForm,
  formFromListing,
  listingDetailsFrom,
  locationFrom,
  saleDetailsFrom,
  saleTermsFrom,
  stepsFor,
  validateStep,
  type FormErrors,
  type ListingForm,
} from "../domain/listings/listing-form";
import type { ListingIntent } from "../domain/listings/listing";
import type { PartnerScope } from "../domain/workspace/workspace";

export interface UploadItem {
  readonly key: string;
  readonly fileName: string;
  readonly previewUrl: string;
  readonly progress: number;
  readonly status: "uploading" | "failed";
  readonly error: string | null;
  readonly file: File;
}

export type EditorTab = "details" | "location" | "photos" | "plans" | "pricing" | "terms" | "availability" | "agent" | "publish";

interface EditorState {
  scope: PartnerScope | null;
  form: ListingForm;
  errors: FormErrors;
  step: number;
  saving: boolean;
  saveError: string | null;
  savedAt: number | null;
  listing: OwnerListing | null;
  terms: SaleTerms | null;
  termsError: string | null;
  loading: boolean;
  loadError: string | null;
  tab: EditorTab;
  drafts: { amenities: string; houseRules: string; terms: string };
  uploads: readonly UploadItem[];
  photoError: string | null;
  photoBusyId: string | null;
  planLabel: string;
  planProgress: number | null;
  planError: string | null;
  planBusyId: string | null;
  calendarFrom: string;
  nights: readonly CalendarNight[];
  blocks: readonly AvailabilityBlock[];
  calendarLoading: boolean;
  calendarError: string | null;
  blockStart: string;
  blockEnd: string;
  blockNote: string;
  blockBusy: boolean;
  publishing: boolean;
  publishError: string | null;
  publishProblems: readonly string[];
  locating: boolean;

  resetForCreate: (intent: ListingIntent) => void;
  setField: <K extends keyof ListingForm>(key: K, value: ListingForm[K]) => void;
  setDraft: (key: "amenities" | "houseRules" | "terms", value: string) => void;
  addItem: (key: "amenities" | "houseRules" | "terms") => void;
  removeItem: (key: "amenities" | "houseRules" | "terms", index: number) => void;
  nextStep: () => boolean;
  previousStep: () => void;
  goToStep: (step: number) => void;
  setLocating: (locating: boolean) => void;
  setCoordinates: (latitude: number, longitude: number) => void;
  createDraft: (organizationId: string) => Promise<OwnerListing | null>;
  load: (scope: PartnerScope, listingId: string) => Promise<void>;
  setTab: (tab: EditorTab) => void;
  saveDetails: () => Promise<boolean>;
  addPhotos: (files: readonly File[]) => Promise<void>;
  retryUpload: (key: string) => Promise<void>;
  dismissUpload: (key: string) => void;
  removePhoto: (photoId: string) => Promise<void>;
  makeCover: (photoId: string) => Promise<void>;
  movePhoto: (photoId: string, direction: -1 | 1) => Promise<void>;
  setPlanLabel: (label: string) => void;
  addFloorPlan: (file: File) => Promise<void>;
  removeFloorPlan: (planId: string) => Promise<void>;
  loadCalendar: (from?: string) => Promise<void>;
  setBlockField: (key: "blockStart" | "blockEnd" | "blockNote", value: string) => void;
  addBlock: () => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  changeState: (action: "PUBLISH" | "UNPUBLISH" | "ARCHIVE") => Promise<OwnerListing | null>;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const startOfMonth = () => {
  const now = new Date();
  return isoDay(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)));
};
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
};

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export const canEditListing = (scope: PartnerScope | null, listing: OwnerListing | null) =>
  scope?.kind === "OWNER" || Boolean(listing?.permissions?.canEditListing);

export const canSeeTerms = (scope: PartnerScope | null, listing: OwnerListing | null) =>
  scope?.kind === "OWNER" || Boolean(listing?.permissions?.canViewCommercial);

const organizationOf = (scope: PartnerScope, listing: OwnerListing) =>
  scope.kind === "OWNER" ? scope.organizationId : (listing.organizationId ?? "");

const ownerOrganization = (scope: PartnerScope | null) => (scope?.kind === "OWNER" ? scope.organizationId : null);

async function uploadOne(
  scope: PartnerScope,
  listing: OwnerListing,
  item: UploadItem,
  currentCount: number,
  set: (fn: (state: EditorState) => Partial<EditorState>) => void,
  get: () => EditorState,
) {
  try {
    const photo = await container.uploadPartnerPhotoUseCase.execute(
      scope,
      organizationOf(scope, listing),
      listing.id,
      item.file,
      currentCount,
      (fraction) =>
        set((state) => ({
          uploads: state.uploads.map((u) => (u.key === item.key ? { ...u, progress: fraction } : u)),
        })),
    );
    URL.revokeObjectURL(item.previewUrl);
    set((state) => {
      const current = state.listing;
      return {
        uploads: state.uploads.filter((u) => u.key !== item.key),
        listing: current
          ? { ...current, media: [...current.media, photo], photos: [...current.photos, photo.url] }
          : current,
      };
    });
  } catch (error) {
    set((state) => ({
      uploads: state.uploads.map((u) =>
        u.key === item.key ? { ...u, status: "failed", error: messageOf(error, "Upload failed") } : u,
      ),
    }));
  }
  if (get().uploads.length === 0 && get().listing) await get().load(scope, listing.id);
}

export const useListingEditorStore = create<EditorState>((set, get) => ({
  scope: null,
  form: emptyForm(),
  errors: {},
  step: 0,
  saving: false,
  saveError: null,
  savedAt: null,
  listing: null,
  terms: null,
  termsError: null,
  loading: false,
  loadError: null,
  tab: "details",
  drafts: { amenities: "", houseRules: "", terms: "" },
  uploads: [],
  photoError: null,
  photoBusyId: null,
  planLabel: "",
  planProgress: null,
  planError: null,
  planBusyId: null,
  calendarFrom: startOfMonth(),
  nights: [],
  blocks: [],
  calendarLoading: false,
  calendarError: null,
  blockStart: "",
  blockEnd: "",
  blockNote: "",
  blockBusy: false,
  publishing: false,
  publishError: null,
  publishProblems: [],
  locating: false,

  resetForCreate: (intent) =>
    set({
      form: emptyForm(intent),
      terms: null,
      errors: {},
      step: 0,
      saving: false,
      saveError: null,
      listing: null,
      drafts: { amenities: "", houseRules: "", terms: "" },
    }),

  setField: (key, value) =>
    set((state) => ({ form: { ...state.form, [key]: value }, errors: { ...state.errors, [key]: undefined } })),

  setDraft: (key, value) => set((state) => ({ drafts: { ...state.drafts, [key]: value } })),

  addItem: (key) => {
    const value = get().drafts[key].trim();
    if (!value) return;
    set((state) => ({
      form: state.form[key].includes(value) ? state.form : { ...state.form, [key]: [...state.form[key], value] },
      drafts: { ...state.drafts, [key]: "" },
    }));
  },

  removeItem: (key, index) =>
    set((state) => ({ form: { ...state.form, [key]: state.form[key].filter((_, i) => i !== index) } })),

  nextStep: () => {
    const errors = validateStep(get().form, get().step);
    if (Object.keys(errors).length > 0) {
      set({ errors });
      return false;
    }
    set((state) => ({ step: Math.min(state.step + 1, stepsFor(state.form.intent).length - 1), errors: {} }));
    return true;
  },

  previousStep: () => set((state) => ({ step: Math.max(state.step - 1, 0), errors: {} })),
  goToStep: (step) => set({ step, errors: {} }),
  setLocating: (locating) => set({ locating }),
  setCoordinates: (latitude, longitude) =>
    set((state) => ({
      form: { ...state.form, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) },
      errors: { ...state.errors, latitude: undefined },
      locating: false,
    })),

  createDraft: async (organizationId) => {
    const form = get().form;
    const steps = stepsFor(form.intent);
    for (let step = 0; step < steps.length; step += 1) {
      const errors = validateStep(form, step);
      if (Object.keys(errors).length > 0) {
        set({ errors, step });
        return null;
      }
    }
    set({ saving: true, saveError: null });
    const property = {
      name: form.name.trim(),
      propertyType: form.propertyType,
      addressLine: form.addressLine.trim(),
      areaLabel: form.areaLabel.trim(),
      cityLabel: form.cityLabel.trim(),
    };
    const location = locationFrom(form);
    try {
      let listing: OwnerListing;
      if (form.intent === "SALE") {
        if (!location) throw new Error("Set the property location before saving");
        const terms = saleTermsFrom(form);
        listing = await container.createSaleListingUseCase.execute(organizationId, {
          property: { ...property, location },
          listing: saleDetailsFrom(form),
          saleTerms: terms.askingPriceInternalCentavos !== null || terms.commercialNotes ? terms : null,
        });
      } else {
        const input: CreatePropertyListingInput = {
          property: { ...property, ...(location ? { location } : {}) },
          unitLabel: form.unitLabel.trim(),
          rentalMode: form.rentalMode,
          listing: listingDetailsFrom(form),
        };
        listing = await container.createPropertyListingUseCase.execute(organizationId, input);
      }
      set({
        saving: false,
        listing,
        scope: { kind: "OWNER", organizationId },
        tab: "photos",
        publishProblems: listing.publishProblems ?? [],
      });
      return listing;
    } catch (error) {
      set({ saving: false, saveError: messageOf(error, "Could not save the property") });
      return null;
    }
  },

  load: async (scope, listingId) => {
    const sameListing = get().listing?.id === listingId;
    set({ scope, loading: !sameListing, loadError: null });
    try {
      const listing = await container.loadPartnerListingUseCase.execute(scope, listingId);
      let terms: SaleTerms | null = null;
      let termsError: string | null = null;
      if (listing.intent === "SALE" && canSeeTerms(scope, listing)) {
        try {
          terms = await container.loadSaleTermsUseCase.execute(scope, listingId);
        } catch (error) {
          termsError = messageOf(error, "Could not load the private terms");
        }
      }
      set((state) => ({
        listing,
        terms,
        termsError,
        loading: false,
        form: sameListing && state.saving ? state.form : formFromListing(listing, terms),
        publishProblems: listing.publishProblems ?? [],
      }));
    } catch (error) {
      set({ loading: false, loadError: messageOf(error, "Could not load this property") });
    }
  },

  setTab: (tab) => set({ tab, saveError: null, publishError: null }),

  saveDetails: async () => {
    const { listing, scope, form } = get();
    if (!listing || !scope) return false;
    const steps = form.intent === "SALE" ? [1, 2, 3] : [1, 2, 3];
    for (const step of steps) {
      const errors = validateStep(form, step);
      if (Object.keys(errors).length > 0) {
        set({ errors, saveError: "Fix the highlighted fields before saving" });
        return false;
      }
    }
    set({ saving: true, saveError: null });
    const property = {
      name: form.name.trim(),
      propertyType: form.propertyType,
      addressLine: form.addressLine.trim(),
      areaLabel: form.areaLabel.trim(),
      cityLabel: form.cityLabel.trim(),
      location: locationFrom(form),
    };
    try {
      let updated: OwnerListing;
      let terms = get().terms;
      if (listing.intent === "SALE") {
        updated = await container.updateSaleListingUseCase.execute(scope, listing.id, {
          listing: saleDetailsFrom(form),
          property,
        });
        if (canSeeTerms(scope, listing) && canEditListing(scope, listing)) {
          terms = await container.saveSaleTermsUseCase.execute(scope, listing.id, saleTermsFrom(form));
        }
      } else {
        const organizationId = ownerOrganization(scope);
        if (!organizationId) throw new Error("Only the owner can edit rental details");
        const details = listingDetailsFrom(form);
        updated = await container.updateListingUseCase.execute(organizationId, listing.id, {
          listing: listing.state === "DRAFT" || !listing.kind ? details : { ...details, kind: listing.kind },
          property,
        });
      }
      set({
        saving: false,
        listing: { ...updated, permissions: listing.permissions, organizationId: listing.organizationId },
        terms,
        form: formFromListing(updated, terms),
        savedAt: Date.now(),
        publishProblems: updated.publishProblems ?? [],
      });
      return true;
    } catch (error) {
      set({ saving: false, saveError: messageOf(error, "Could not save changes") });
      return false;
    }
  },

  addPhotos: async (files) => {
    const { listing, scope } = get();
    if (!listing || !scope) return;
    set({ photoError: null });
    let count = listing.media.length + get().uploads.length;
    const accepted: UploadItem[] = [];
    for (const file of files) {
      const problem = photoProblem(file, count);
      if (problem) {
        set({ photoError: `${file.name}: ${problem}` });
        continue;
      }
      count += 1;
      accepted.push({
        key: crypto.randomUUID(),
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: "uploading",
        error: null,
        file,
      });
    }
    set((state) => ({ uploads: [...state.uploads, ...accepted] }));
    await Promise.all(
      accepted.map((item, index) => uploadOne(scope, listing, item, listing.media.length + index, set, get)),
    );
  },

  retryUpload: async (key) => {
    const { listing, scope } = get();
    const item = get().uploads.find((u) => u.key === key);
    if (!listing || !scope || !item) return;
    set((state) => ({
      uploads: state.uploads.map((u) => (u.key === key ? { ...u, status: "uploading", progress: 0, error: null } : u)),
    }));
    await uploadOne(scope, listing, { ...item, status: "uploading" }, listing.media.length, set, get);
  },

  dismissUpload: (key) =>
    set((state) => {
      const item = state.uploads.find((u) => u.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return { uploads: state.uploads.filter((u) => u.key !== key) };
    }),

  removePhoto: async (photoId) => {
    const { listing, scope } = get();
    if (!listing || !scope) return;
    if (listing.state === "PUBLISHED" && listing.media.length <= 1) {
      set({ photoError: "A published listing needs at least one photo. Add another before removing this one." });
      return;
    }
    set({ photoBusyId: photoId, photoError: null });
    try {
      await container.removePartnerPhotoUseCase.execute(scope, listing.id, photoId);
      await get().load(scope, listing.id);
      set({ photoBusyId: null });
    } catch (error) {
      set({ photoBusyId: null, photoError: messageOf(error, "Could not remove that photo") });
    }
  },

  makeCover: async (photoId) => {
    const { listing, scope } = get();
    if (!listing || !scope) return;
    const ids = [photoId, ...listing.media.map((m) => m.id).filter((id) => id !== photoId)];
    set({ photoBusyId: photoId, photoError: null });
    try {
      const updated = await container.reorderPartnerPhotosUseCase.execute(scope, listing.id, ids);
      set({ listing: { ...listing, media: updated.media, photos: updated.photos }, photoBusyId: null });
    } catch (error) {
      set({ photoBusyId: null, photoError: messageOf(error, "Could not change the cover photo") });
    }
  },

  movePhoto: async (photoId, direction) => {
    const { listing, scope } = get();
    if (!listing || !scope) return;
    const ids = listing.media.map((m) => m.id);
    const index = ids.indexOf(photoId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    set({ photoBusyId: photoId, photoError: null });
    try {
      const updated = await container.reorderPartnerPhotosUseCase.execute(scope, listing.id, ids);
      set({ listing: { ...listing, media: updated.media, photos: updated.photos }, photoBusyId: null });
    } catch (error) {
      set({ photoBusyId: null, photoError: messageOf(error, "Could not reorder photos") });
    }
  },

  setPlanLabel: (planLabel) => set({ planLabel, planError: null }),

  addFloorPlan: async (file) => {
    const { listing, scope, planLabel } = get();
    if (!listing || !scope) return;
    const problem = floorPlanProblem(file, listing.floorPlans.length, planLabel);
    if (problem) {
      set({ planError: problem });
      return;
    }
    set({ planProgress: 0, planError: null });
    try {
      const plan = await container.uploadFloorPlanUseCase.execute(
        scope,
        organizationOf(scope, listing),
        listing.id,
        file,
        planLabel,
        listing.floorPlans.length,
        (fraction) => set({ planProgress: fraction }),
      );
      set((state) => ({
        planProgress: null,
        planLabel: "",
        listing: state.listing ? { ...state.listing, floorPlans: [...state.listing.floorPlans, plan] } : state.listing,
      }));
    } catch (error) {
      set({ planProgress: null, planError: messageOf(error, "Could not upload the floor plan") });
    }
  },

  removeFloorPlan: async (planId) => {
    const { listing, scope } = get();
    if (!listing || !scope) return;
    set({ planBusyId: planId, planError: null });
    try {
      await container.removeFloorPlanUseCase.execute(scope, listing.id, planId);
      set((state) => ({
        planBusyId: null,
        listing: state.listing
          ? { ...state.listing, floorPlans: state.listing.floorPlans.filter((p) => p.id !== planId) }
          : state.listing,
      }));
    } catch (error) {
      set({ planBusyId: null, planError: messageOf(error, "Could not remove the floor plan") });
    }
  },

  loadCalendar: async (from) => {
    const { listing, scope } = get();
    const organizationId = ownerOrganization(scope);
    if (!listing || !organizationId) return;
    const start = from ?? get().calendarFrom;
    set({ calendarLoading: true, calendarError: null, calendarFrom: start });
    try {
      const calendar = await container.loadListingCalendarUseCase.execute(organizationId, listing.id, start, addDays(start, 62));
      set({ nights: calendar.nights, blocks: calendar.blocks, calendarLoading: false });
    } catch (error) {
      set({ calendarLoading: false, calendarError: messageOf(error, "Could not load availability") });
    }
  },

  setBlockField: (key, value) => set({ [key]: value } as Partial<EditorState>),

  addBlock: async () => {
    const { listing, scope, blockStart, blockEnd, blockNote } = get();
    const organizationId = ownerOrganization(scope);
    if (!listing || !organizationId) return;
    set({ blockBusy: true, calendarError: null });
    try {
      await container.blockDatesUseCase.execute(organizationId, listing.id, blockStart, blockEnd, blockNote.trim() || null);
      set({ blockBusy: false, blockStart: "", blockEnd: "", blockNote: "" });
      await get().loadCalendar();
    } catch (error) {
      set({ blockBusy: false, calendarError: messageOf(error, "Could not block those dates") });
    }
  },

  removeBlock: async (blockId) => {
    const organizationId = ownerOrganization(get().scope);
    if (!organizationId) return;
    set({ blockBusy: true, calendarError: null });
    try {
      await container.unblockDatesUseCase.execute(organizationId, blockId);
      set({ blockBusy: false });
      await get().loadCalendar();
    } catch (error) {
      set({ blockBusy: false, calendarError: messageOf(error, "Could not reopen those dates") });
    }
  },

  changeState: async (action) => {
    const { listing, scope } = get();
    const organizationId = ownerOrganization(scope);
    if (!listing || !organizationId) return null;
    set({ publishing: true, publishError: null });
    try {
      const updated = await container.changeListingStateUseCase.execute(organizationId, listing.id, action);
      set({ publishing: false, listing: { ...updated, publishProblems: [] }, publishProblems: [] });
      return updated;
    } catch (error) {
      const details = (error as { details?: readonly string[] }).details ?? [];
      set({
        publishing: false,
        publishError: messageOf(error, "That change didn't go through"),
        publishProblems: details.length > 0 ? details : get().publishProblems,
      });
      return null;
    }
  },
}));
