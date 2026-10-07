import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type {
  AvailabilityBlock,
  CalendarNight,
  CreatePropertyListingInput,
  OwnerListing,
} from "../domain/listings/listing";
import { photoProblem } from "../domain/listings/listing";
import {
  WIZARD_STEPS,
  emptyForm,
  formFromListing,
  listingDetailsFrom,
  validateStep,
  type FormErrors,
  type ListingForm,
} from "../domain/listings/listing-form";


export interface UploadItem {
  readonly key: string;
  readonly fileName: string;
  readonly previewUrl: string;
  readonly progress: number;
  readonly status: "uploading" | "failed";
  readonly error: string | null;
  readonly file: File;
}

interface EditorState {
  form: ListingForm;
  errors: FormErrors;
  step: number;
  saving: boolean;
  saveError: string | null;
  savedAt: number | null;
  listing: OwnerListing | null;
  loading: boolean;
  loadError: string | null;
  tab: "details" | "photos" | "pricing" | "availability" | "publish";
  drafts: { amenities: string; houseRules: string; terms: string };
  uploads: readonly UploadItem[];
  photoError: string | null;
  photoBusyId: string | null;
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

  resetForCreate: () => void;
  setField: <K extends keyof ListingForm>(key: K, value: ListingForm[K]) => void;
  setDraft: (key: "amenities" | "houseRules" | "terms", value: string) => void;
  addItem: (key: "amenities" | "houseRules" | "terms") => void;
  removeItem: (key: "amenities" | "houseRules" | "terms", index: number) => void;
  nextStep: () => boolean;
  previousStep: () => void;
  goToStep: (step: number) => void;
  createDraft: (organizationId: string) => Promise<OwnerListing | null>;
  load: (organizationId: string, listingId: string) => Promise<void>;
  setTab: (tab: EditorState["tab"]) => void;
  saveDetails: (organizationId: string) => Promise<boolean>;
  addPhotos: (organizationId: string, files: readonly File[]) => Promise<void>;
  retryUpload: (organizationId: string, key: string) => Promise<void>;
  dismissUpload: (key: string) => void;
  removePhoto: (organizationId: string, photoId: string) => Promise<void>;
  makeCover: (organizationId: string, photoId: string) => Promise<void>;
  movePhoto: (organizationId: string, photoId: string, direction: -1 | 1) => Promise<void>;
  loadCalendar: (organizationId: string, from?: string) => Promise<void>;
  setBlockField: (key: "blockStart" | "blockEnd" | "blockNote", value: string) => void;
  addBlock: (organizationId: string) => Promise<void>;
  removeBlock: (organizationId: string, blockId: string) => Promise<void>;
  changeState: (organizationId: string, action: "PUBLISH" | "UNPUBLISH" | "ARCHIVE") => Promise<OwnerListing | null>;
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

async function uploadOne(
  organizationId: string,
  listingId: string,
  item: UploadItem,
  currentCount: number,
  set: (fn: (state: EditorState) => Partial<EditorState>) => void,
  get: () => EditorState,
) {
  try {
    const photo = await container.uploadListingPhotoUseCase.execute(
      organizationId,
      listingId,
      item.file,
      currentCount,
      (fraction) =>
        set((state) => ({
          uploads: state.uploads.map((u) => (u.key === item.key ? { ...u, progress: fraction } : u)),
        })),
    );
    URL.revokeObjectURL(item.previewUrl);
    set((state) => {
      const listing = state.listing;
      return {
        uploads: state.uploads.filter((u) => u.key !== item.key),
        listing: listing
          ? {
              ...listing,
              media: [...listing.media, photo],
              photos: [...listing.photos, photo.url],
            }
          : listing,
      };
    });
  } catch (error) {
    set((state) => ({
      uploads: state.uploads.map((u) =>
        u.key === item.key ? { ...u, status: "failed", error: messageOf(error, "Upload failed") } : u,
      ),
    }));
  }
  if (get().uploads.length === 0) {
    const listing = get().listing;
    if (listing) await get().load(organizationId, listing.id);
  }
}

export const useListingEditorStore = create<EditorState>((set, get) => ({
  form: emptyForm(),
  errors: {},
  step: 0,
  saving: false,
  saveError: null,
  savedAt: null,
  listing: null,
  loading: false,
  loadError: null,
  tab: "details",
  drafts: { amenities: "", houseRules: "", terms: "" },
  uploads: [],
  photoError: null,
  photoBusyId: null,
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

  resetForCreate: () =>
    set({
      form: emptyForm(),
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
    set((state) => ({ step: Math.min(state.step + 1, WIZARD_STEPS.length - 1), errors: {} }));
    return true;
  },

  previousStep: () => set((state) => ({ step: Math.max(state.step - 1, 0), errors: {} })),
  goToStep: (step) => set({ step, errors: {} }),

  createDraft: async (organizationId) => {
    const form = get().form;
    for (let step = 0; step < WIZARD_STEPS.length; step += 1) {
      const errors = validateStep(form, step);
      if (Object.keys(errors).length > 0) {
        set({ errors, step });
        return null;
      }
    }
    set({ saving: true, saveError: null });
    try {
      const input: CreatePropertyListingInput = {
        property: {
          name: form.name.trim(),
          propertyType: form.propertyType,
          addressLine: form.addressLine.trim(),
          areaLabel: form.areaLabel.trim(),
          cityLabel: form.cityLabel.trim(),
        },
        unitLabel: form.unitLabel.trim(),
        rentalMode: form.rentalMode,
        listing: listingDetailsFrom(form),
      };
      const listing = await container.createPropertyListingUseCase.execute(organizationId, input);
      set({ saving: false, listing, tab: "photos", publishProblems: listing.publishProblems ?? [] });
      return listing;
    } catch (error) {
      set({ saving: false, saveError: messageOf(error, "Could not save the property") });
      return null;
    }
  },

  load: async (organizationId, listingId) => {
    const sameListing = get().listing?.id === listingId;
    set({ loading: !sameListing, loadError: null });
    try {
      const listing = await container.loadListingUseCase.execute(organizationId, listingId);
      set((state) => ({
        listing,
        loading: false,
        form: sameListing && state.saving ? state.form : formFromListing(listing),
        publishProblems: listing.publishProblems ?? [],
      }));
    } catch (error) {
      set({ loading: false, loadError: messageOf(error, "Could not load this property") });
    }
  },

  setTab: (tab) => set({ tab, saveError: null, publishError: null }),

  saveDetails: async (organizationId) => {
    const listing = get().listing;
    if (!listing) return false;
    const form = get().form;
    for (const step of [1, 2, 3]) {
      const errors = validateStep(form, step);
      if (Object.keys(errors).length > 0) {
        set({ errors, saveError: "Fix the highlighted fields before saving" });
        return false;
      }
    }
    set({ saving: true, saveError: null });
    try {
      const details = listingDetailsFrom(form);
      const updated = await container.updateListingUseCase.execute(organizationId, listing.id, {
        listing: listing.state === "DRAFT" ? details : { ...details, kind: listing.kind },
        property: {
          name: form.name.trim(),
          propertyType: form.propertyType,
          addressLine: form.addressLine.trim(),
          areaLabel: form.areaLabel.trim(),
          cityLabel: form.cityLabel.trim(),
        },
      });
      set({
        saving: false,
        listing: updated,
        form: formFromListing(updated),
        savedAt: Date.now(),
        publishProblems: updated.publishProblems ?? [],
      });
      return true;
    } catch (error) {
      set({ saving: false, saveError: messageOf(error, "Could not save changes") });
      return false;
    }
  },

  addPhotos: async (organizationId, files) => {
    const listing = get().listing;
    if (!listing) return;
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
      accepted.map((item, index) =>
        uploadOne(organizationId, listing.id, item, listing.media.length + index, set, get),
      ),
    );
  },

  retryUpload: async (organizationId, key) => {
    const listing = get().listing;
    const item = get().uploads.find((u) => u.key === key);
    if (!listing || !item) return;
    set((state) => ({
      uploads: state.uploads.map((u) => (u.key === key ? { ...u, status: "uploading", progress: 0, error: null } : u)),
    }));
    await uploadOne(organizationId, listing.id, { ...item, status: "uploading" }, listing.media.length, set, get);
  },

  dismissUpload: (key) =>
    set((state) => {
      const item = state.uploads.find((u) => u.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return { uploads: state.uploads.filter((u) => u.key !== key) };
    }),

  removePhoto: async (organizationId, photoId) => {
    const listing = get().listing;
    if (!listing) return;
    set({ photoBusyId: photoId, photoError: null });
    try {
      await container.removeListingPhotoUseCase.execute(organizationId, listing.id, photoId);
      await get().load(organizationId, listing.id);
      set({ photoBusyId: null });
    } catch (error) {
      set({ photoBusyId: null, photoError: messageOf(error, "Could not remove that photo") });
    }
  },

  makeCover: async (organizationId, photoId) => {
    const listing = get().listing;
    if (!listing) return;
    const ids = [photoId, ...listing.media.map((m) => m.id).filter((id) => id !== photoId)];
    set({ photoBusyId: photoId, photoError: null });
    try {
      const updated = await container.reorderListingPhotosUseCase.execute(organizationId, listing.id, ids);
      set({ listing: { ...listing, media: updated.media, photos: updated.photos }, photoBusyId: null });
    } catch (error) {
      set({ photoBusyId: null, photoError: messageOf(error, "Could not change the cover photo") });
    }
  },

  movePhoto: async (organizationId, photoId, direction) => {
    const listing = get().listing;
    if (!listing) return;
    const ids = listing.media.map((m) => m.id);
    const index = ids.indexOf(photoId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    set({ photoBusyId: photoId, photoError: null });
    try {
      const updated = await container.reorderListingPhotosUseCase.execute(organizationId, listing.id, ids);
      set({ listing: { ...listing, media: updated.media, photos: updated.photos }, photoBusyId: null });
    } catch (error) {
      set({ photoBusyId: null, photoError: messageOf(error, "Could not reorder photos") });
    }
  },

  loadCalendar: async (organizationId, from) => {
    const listing = get().listing;
    if (!listing) return;
    const start = from ?? get().calendarFrom;
    set({ calendarLoading: true, calendarError: null, calendarFrom: start });
    try {
      const calendar = await container.loadListingCalendarUseCase.execute(
        organizationId,
        listing.id,
        start,
        addDays(start, 62),
      );
      set({ nights: calendar.nights, blocks: calendar.blocks, calendarLoading: false });
    } catch (error) {
      set({ calendarLoading: false, calendarError: messageOf(error, "Could not load availability") });
    }
  },

  setBlockField: (key, value) => set({ [key]: value } as Partial<EditorState>),

  addBlock: async (organizationId) => {
    const listing = get().listing;
    if (!listing) return;
    const { blockStart, blockEnd, blockNote } = get();
    set({ blockBusy: true, calendarError: null });
    try {
      await container.blockDatesUseCase.execute(organizationId, listing.id, blockStart, blockEnd, blockNote.trim() || null);
      set({ blockBusy: false, blockStart: "", blockEnd: "", blockNote: "" });
      await get().loadCalendar(organizationId);
    } catch (error) {
      set({ blockBusy: false, calendarError: messageOf(error, "Could not block those dates") });
    }
  },

  removeBlock: async (organizationId, blockId) => {
    set({ blockBusy: true, calendarError: null });
    try {
      await container.unblockDatesUseCase.execute(organizationId, blockId);
      set({ blockBusy: false });
      await get().loadCalendar(organizationId);
    } catch (error) {
      set({ blockBusy: false, calendarError: messageOf(error, "Could not reopen those dates") });
    }
  },

  changeState: async (organizationId, action) => {
    const listing = get().listing;
    if (!listing) return null;
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
