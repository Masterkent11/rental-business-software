import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { Collection } from "../domain/payments/collection";
import type { OwnerListing } from "../domain/listings/listing";
import type { OwnerBooking } from "../domain/bookings/booking";

interface DashboardState {
  organizationId: string | null;
  listings: readonly OwnerListing[];
  upcoming: readonly OwnerBooking[];
  upcomingTotal: number;
  collection: Collection | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  collectionError: string | null;
  collectionLoading: boolean;
  reset: () => void;
  load: (organizationId: string) => Promise<void>;
  loadCollection: (organizationId: string) => Promise<void>;
}
const empty = { listings: [], upcoming: [], upcomingTotal: 0, collection: null, loaded: false };
let request = 0;
let collectionRequest = 0;
export const useDashboardStore = create<DashboardState>((set, get) => ({
  ...empty, organizationId: null, loading: false, error: null, collectionError: null, collectionLoading: false,
  reset: () => {
    ++request;
    ++collectionRequest;
    set({ ...empty, organizationId: null, loading: false, error: null, collectionError: null, collectionLoading: false });
  },
  loadCollection: async organizationId => {
    const version = ++collectionRequest;
    if (get().organizationId !== organizationId) {
      ++request;
      set({ ...empty, organizationId, loading: false, error: null });
    }
    set({ collectionLoading: true, collection: null, collectionError: null });
    try {
      const collection = await container.loadDashboardUseCase.execute(organizationId);
      if (get().organizationId === organizationId && version === collectionRequest) set({ collection, collectionLoading: false });
    } catch (error) {
      if (get().organizationId === organizationId && version === collectionRequest) set({ collectionLoading: false, collectionError: error instanceof Error ? error.message : "Collection data is unavailable" });
    }
  },
  load: async organizationId => {
    const version = ++request;
    set({ ...(get().organizationId !== organizationId ? empty : {}), organizationId, loading: true, error: null });
    void get().loadCollection(organizationId);
    try {
      const [listings, upcoming] = await Promise.all([
        container.loadListingsUseCase.execute(organizationId),
        container.loadBookingsUseCase.execute(organizationId, { bucket: "UPCOMING", limit: 2, offset: 0 }),
      ]);
      if (version === request && get().organizationId === organizationId) set({ listings, upcoming: upcoming.items, upcomingTotal: upcoming.total, loading: false, loaded: true });
    } catch (error) {
      if (version === request && get().organizationId === organizationId) set({ loading: false, error: error instanceof Error ? error.message : "Could not load your dashboard" });
    }
  },
}));
