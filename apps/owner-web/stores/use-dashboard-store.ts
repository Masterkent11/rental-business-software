import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { Collection } from "../domain/payments/collection";
import type { OwnerListing } from "../domain/listings/listing";
import type { OwnerBooking } from "../domain/bookings/booking";

interface DashboardState {
  listings: readonly OwnerListing[];
  upcoming: readonly OwnerBooking[];
  upcomingTotal: number;
  awaitingPayment: number;
  collection: Collection | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  collectionError: string | null;

  collectionLoading: boolean;
  load: (organizationId: string) => Promise<void>;
  loadCollection: (organizationId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  listings: [],
  upcoming: [],
  upcomingTotal: 0,
  awaitingPayment: 0,
  collection: null,
  loading: false,
  loaded: false,
  error: null,
  collectionError: null,
  collectionLoading: false,

  loadCollection: async (organizationId) => {
    set({ collectionLoading: true, collectionError: null });
    try {
      const collection = await container.loadDashboardUseCase.execute(organizationId);
      set({ collection, collectionLoading: false });
    } catch (error) {
      set({ collectionLoading: false, collectionError: error instanceof Error ? error.message : "Collection data is unavailable" });
    }
  },

  load: async (organizationId) => {
    set({ loading: true, error: null });
    try {
      const [listings, upcoming, pending] = await Promise.all([
        container.loadListingsUseCase.execute(organizationId),
        container.loadBookingsUseCase.execute(organizationId, { bucket: "UPCOMING", limit: 5, offset: 0 }),
        container.loadBookingsUseCase.execute(organizationId, { bucket: "PENDING_PAYMENT", limit: 1, offset: 0 }),
      ]);
      set({
        listings,
        upcoming: upcoming.items,
        upcomingTotal: upcoming.total,
        awaitingPayment: pending.total,
        loading: false,
        loaded: true,
      });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not load your dashboard" });
      return;
    }
    try {
      const collection = await container.loadDashboardUseCase.execute(organizationId);
      set({ collection, collectionError: null });
    } catch (error) {
      set({ collectionError: error instanceof Error ? error.message : "Collection data is unavailable" });
    }
  },
}));
