import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { ListingAction, ListingState, OwnerListing } from "../domain/listings/listing";

export type ListingFilter = "ALL" | ListingState;

interface PendingAction {
  readonly listing: OwnerListing;
  readonly action: ListingAction;
}

interface ListingsState {
  organizationId: string | null;
  listings: readonly OwnerListing[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  filter: ListingFilter;
  query: string;
  busyId: string | null;
  pending: PendingAction | null;
  actionError: string | null;

  reset: () => void;
  load: (organizationId: string) => Promise<void>;
  setFilter: (filter: ListingFilter) => void;
  setQuery: (query: string) => void;
  askToConfirm: (listing: OwnerListing, action: ListingAction) => void;
  cancelConfirm: () => void;
  runAction: (organizationId: string, listing: OwnerListing, action: ListingAction) => Promise<boolean>;
  replace: (listing: OwnerListing) => void;
}

let request = 0;
let actionRequest = 0;

export const useListingsStore = create<ListingsState>((set, get) => ({
  organizationId: null,
  listings: [],
  loading: false,
  loaded: false,
  error: null,
  filter: "ALL",
  query: "",
  busyId: null,
  pending: null,
  actionError: null,

  reset: () => {
    ++request;
    ++actionRequest;
    set({ organizationId: null, listings: [], loading: false, loaded: false, error: null,
      filter: "ALL", query: "", busyId: null, pending: null, actionError: null });
  },
  load: async (organizationId) => {
    if (get().organizationId !== organizationId) {
      const filter = get().filter;
      get().reset();
      set({ filter });
    }
    const version = ++request;
    set({ organizationId, loading: true, error: null });
    try {
      const listings = await container.loadListingsUseCase.execute(organizationId);
      if (version !== request || get().organizationId !== organizationId) return;
      set({ listings, loading: false, loaded: true });
    } catch (error) {
      if (version !== request || get().organizationId !== organizationId) return;
      set({ loading: false, error: error instanceof Error ? error.message : "Could not load your properties" });
    }
  },

  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  askToConfirm: (listing, action) => set({ pending: { listing, action }, actionError: null }),
  cancelConfirm: () => set({ pending: null, actionError: null }),

  runAction: async (organizationId, listing, action) => {
    if (get().organizationId !== organizationId) return false;
    const version = ++actionRequest;
    set({ busyId: listing.id, actionError: null });
    try {
      const updated = await container.changeListingStateUseCase.execute(organizationId, listing.id, action);
      if (version !== actionRequest || get().organizationId !== organizationId) return false;
      get().replace(updated);
      set({ busyId: null, pending: null });
      return true;
    } catch (error) {
      if (version !== actionRequest || get().organizationId !== organizationId) return false;
      set({ busyId: null, actionError: error instanceof Error ? error.message : "That change didn't go through" });
      return false;
    }
  },

  replace: (listing) =>
    set((state) => ({
      listings:
        listing.state === "ARCHIVED"
          ? state.listings.filter((l) => l.id !== listing.id)
          : state.listings.some((l) => l.id === listing.id)
            ? state.listings.map((l) => (l.id === listing.id ? listing : l))
            : [listing, ...state.listings],
    })),
}));
