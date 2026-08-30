/**
 * Presentation Store: useListingsStore
 *
 * Rules:
 * - Depends ONLY on Application Use Cases via Composition Root.
 * - NO concrete Infrastructure adapter imports.
 */

import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type {
  CreateListingInput,
  OrganizationResource,
  OwnerListing,
} from "../domain/listings/listing";

const DEFAULT_AMENITIES = [
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

const DEFAULT_HOUSE_RULES = [
  "No smoking inside the premises",
  "Quiet hours observed from 10:00 PM to 8:00 AM",
];

interface ListingsState {
  listings: readonly OwnerListing[];
  resources: readonly OrganizationResource[];
  tab: string;
  search: string;
  loading: boolean;
  error: string | null;
  isCreateOpen: boolean;
  previewPhoto: string | null;
  togglingId: string | null;
  submitting: boolean;
  createError: string | null;

  // Form State
  formResourceId: string;
  formKind: "LONG_TERM" | "SHORT_TERM";
  formTitle: string;
  formDescription: string;
  formPricePesos: string;
  formAdvanceMonths: string;
  formDepositMonths: string;
  formMinStayNights: string;
  formSelectedAmenities: string[];
  formPhotos: string[];
  formValidationError: string | null;

  // Actions
  setTab: (tab: string) => void;
  setSearch: (search: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openPreview: (photo: string) => void;
  closePreview: () => void;
  loadListings: (organizationId: string) => Promise<void>;
  loadResources: (organizationId: string) => Promise<void>;
  createListing: (organizationId: string, input: CreateListingInput) => Promise<boolean>;
  togglePublish: (organizationId: string, listing: OwnerListing) => Promise<void>;

  // Form Setters & Actions
  setFormResourceId: (id: string) => void;
  setFormKind: (kind: "LONG_TERM" | "SHORT_TERM") => void;
  setFormTitle: (title: string) => void;
  setFormDescription: (description: string) => void;
  setFormPricePesos: (price: string) => void;
  setFormAdvanceMonths: (months: string) => void;
  setFormDepositMonths: (months: string) => void;
  setFormMinStayNights: (nights: string) => void;
  toggleFormAmenity: (name: string) => void;
  addFormPhotos: (dataUrls: string[]) => void;
  removeFormPhoto: (index: number) => void;
  makeCoverPhoto: (index: number) => void;
  setFormValidationError: (err: string | null) => void;
  resetForm: () => void;
  submitCreateListing: (organizationId: string) => Promise<boolean>;
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  listings: [],
  resources: [],
  tab: "all",
  search: "",
  loading: false,
  error: null,
  isCreateOpen: false,
  previewPhoto: null,
  togglingId: null,
  submitting: false,
  createError: null,

  formResourceId: "",
  formKind: "LONG_TERM",
  formTitle: "",
  formDescription: "",
  formPricePesos: "8500",
  formAdvanceMonths: "1",
  formDepositMonths: "2",
  formMinStayNights: "2",
  formSelectedAmenities: [DEFAULT_AMENITIES[0]!, DEFAULT_AMENITIES[1]!, DEFAULT_AMENITIES[2]!],
  formPhotos: [],
  formValidationError: null,

  setTab: (tab) => set({ tab }),
  setSearch: (search) => set({ search }),
  openCreateModal: () => {
    const defaultResource = get().resources[0];
    set({
      isCreateOpen: true,
      createError: null,
      formValidationError: null,
      formResourceId: defaultResource?.id ?? "",
      formTitle: defaultResource ? `${defaultResource.propertyName} - ${defaultResource.label}` : "",
    });
  },
  closeCreateModal: () => set({ isCreateOpen: false, createError: null, formValidationError: null }),
  openPreview: (previewPhoto) => set({ previewPhoto }),
  closePreview: () => set({ previewPhoto: null }),

  setFormResourceId: (id: string) => {
    const chosen = get().resources.find((r) => r.id === id);
    set({
      formResourceId: id,
      formTitle: chosen ? `${chosen.propertyName} - ${chosen.label}` : get().formTitle,
    });
  },
  setFormKind: (formKind) => set({ formKind }),
  setFormTitle: (formTitle) => set({ formTitle }),
  setFormDescription: (formDescription) => set({ formDescription }),
  setFormPricePesos: (formPricePesos) => set({ formPricePesos }),
  setFormAdvanceMonths: (formAdvanceMonths) => set({ formAdvanceMonths }),
  setFormDepositMonths: (formDepositMonths) => set({ formDepositMonths }),
  setFormMinStayNights: (formMinStayNights) => set({ formMinStayNights }),
  toggleFormAmenity: (name: string) => {
    const current = get().formSelectedAmenities;
    set({
      formSelectedAmenities: current.includes(name)
        ? current.filter((a) => a !== name)
        : [...current, name],
    });
  },
  addFormPhotos: (dataUrls: string[]) => {
    set({ formPhotos: [...get().formPhotos, ...dataUrls] });
  },
  removeFormPhoto: (index: number) => {
    set({ formPhotos: get().formPhotos.filter((_, i) => i !== index) });
  },
  makeCoverPhoto: (index: number) => {
    if (index === 0) return;
    const copy = [...get().formPhotos];
    const [item] = copy.splice(index, 1);
    if (item) {
      set({ formPhotos: [item, ...copy] });
    }
  },
  setFormValidationError: (formValidationError) => set({ formValidationError }),
  resetForm: () =>
    set({
      formResourceId: "",
      formKind: "LONG_TERM",
      formTitle: "",
      formDescription: "",
      formPricePesos: "8500",
      formAdvanceMonths: "1",
      formDepositMonths: "2",
      formMinStayNights: "2",
      formSelectedAmenities: [DEFAULT_AMENITIES[0]!, DEFAULT_AMENITIES[1]!, DEFAULT_AMENITIES[2]!],
      formPhotos: [],
      formValidationError: null,
      createError: null,
    }),

  loadListings: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const items = await container.loadListingsUseCase.execute(organizationId);
      set({ listings: items, loading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load listings";
      set({ error: message, loading: false });
    }
  },

  loadResources: async (organizationId: string) => {
    try {
      const resources = await container.loadResourcesUseCase.execute(organizationId);
      set({ resources });
    } catch {
      // Non-blocking
    }
  },

  createListing: async (organizationId: string, input: CreateListingInput) => {
    set({ submitting: true, createError: null });
    try {
      await container.createListingUseCase.execute(organizationId, input);
      set({ isCreateOpen: false, submitting: false });
      get().resetForm();
      await get().loadListings(organizationId);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create listing";
      set({ createError: message, submitting: false });
      return false;
    }
  },

  submitCreateListing: async (organizationId: string) => {
    const {
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
      resources,
    } = get();

    set({ formValidationError: null });

    const effectiveResourceId = formResourceId || resources[0]?.id || "";

    const rawInput = {
      resourceId: effectiveResourceId,
      kind: formKind,
      title: formTitle.trim(),
      description: formDescription.trim(),
      pricePesos: Number(formPricePesos),
      amenities: formSelectedAmenities,
      houseRules: DEFAULT_HOUSE_RULES,
      terms: [
        formKind === "LONG_TERM"
          ? `${formAdvanceMonths} month advance + ${formDepositMonths} months security deposit`
          : `Minimum stay of ${formMinStayNights} nights`,
      ],
      minStayNights: formKind === "SHORT_TERM" ? Number(formMinStayNights) || 1 : null,
      advanceMonths: formKind === "LONG_TERM" ? Number(formAdvanceMonths) || 0 : 0,
      depositMonths: formKind === "LONG_TERM" ? Number(formDepositMonths) || 0 : 0,
      photos: formPhotos,
    };

    const { CreateListingInputDtoSchema } = await import(
      "../infrastructure/http/dto/listing.dto"
    );
    const parsed = CreateListingInputDtoSchema.safeParse(rawInput);
    if (!parsed.success) {
      set({ formValidationError: parsed.error.issues[0]?.message ?? "Invalid listing details." });
      return false;
    }

    return get().createListing(organizationId, parsed.data);
  },

  togglePublish: async (organizationId: string, listing: OwnerListing) => {
    set({ togglingId: listing.id });
    try {
      await container.togglePublishListingUseCase.execute(
        organizationId,
        listing.id,
        listing.state !== "PUBLISHED",
      );
      await get().loadListings(organizationId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update publish state";
      alert(message);
    } finally {
      set({ togglingId: null });
    }
  },
}));
