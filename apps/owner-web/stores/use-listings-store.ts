import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { ListingAction, ListingState, OwnerListing } from "../domain/listings/listing";

export type ListingFilter = "ALL" | ListingState;

interface PendingAction {
  readonly listing: OwnerListing;
  readonly action: ListingAction;
}

interface ListingsState {
  listings: readonly OwnerListing[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  filter: ListingFilter;
  query: string;
  busyId: string | null;
  pending: PendingAction | null;
  actionError: string | null;

  load: (organizationId: string) => Promise<void>;
  setFilter: (filter: ListingFilter) => void;
  setQuery: (query: string) => void;
  askToConfirm: (listing: OwnerListing, action: ListingAction) => void;
  cancelConfirm: () => void;
  runAction: (organizationId: string, listing: OwnerListing, action: ListingAction) => Promise<boolean>;
  replace: (listing: OwnerListing) => void;
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  listings: [],
  loading: false,
  loaded: false,
  error: null,
  filter: "ALL",
  query: "",
  busyId: null,
  pending: null,
  actionError: null,

  load: async (organizationId) => {
    set({ loading: true, error: null });
    try {
      const listings = await container.loadListingsUseCase.execute(organizationId);
      set({ listings, loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not load your properties" });
    }
  },

  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  askToConfirm: (listing, action) => set({ pending: { listing, action }, actionError: null }),
  cancelConfirm: () => set({ pending: null, actionError: null }),

  runAction: async (organizationId, listing, action) => {
    set({ busyId: listing.id, actionError: null });
    try {
      const updated = await container.changeListingStateUseCase.execute(organizationId, listing.id, action);
      get().replace(updated);
      set({ busyId: null, pending: null });
      return true;
    } catch (error) {
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
