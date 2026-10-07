import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { BookingAction, BookingBucket, OwnerBooking } from "../domain/bookings/booking";

const PAGE_SIZE = 20;

interface BookingsState {
  items: readonly OwnerBooking[];
  total: number;
  bucket: BookingBucket | "ALL";
  query: string;
  page: number;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  selected: OwnerBooking | null;
  selectedLoading: boolean;
  selectedError: string | null;
  actionBusy: boolean;
  actionError: string | null;

  load: (organizationId: string) => Promise<void>;
  setBucket: (organizationId: string, bucket: BookingBucket | "ALL") => Promise<void>;
  setQuery: (query: string) => void;
  search: (organizationId: string) => Promise<void>;
  goToPage: (organizationId: string, page: number) => Promise<void>;
  select: (organizationId: string, bookingId: string | null) => Promise<void>;
  act: (organizationId: string, action: BookingAction) => Promise<void>;
}

export const BOOKINGS_PAGE_SIZE = PAGE_SIZE;

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export const useBookingsStore = create<BookingsState>((set, get) => ({
  items: [],
  total: 0,
  bucket: "ALL",
  query: "",
  page: 0,
  loading: false,
  loaded: false,
  error: null,
  selected: null,
  selectedLoading: false,
  selectedError: null,
  actionBusy: false,
  actionError: null,

  load: async (organizationId) => {
    const { bucket, query, page } = get();
    set({ loading: true, error: null });
    try {
      const result = await container.loadBookingsUseCase.execute(organizationId, {
        ...(bucket !== "ALL" ? { bucket } : {}),
        ...(query.trim() ? { q: query.trim() } : {}),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      set({ items: result.items, total: result.total, loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, error: messageOf(error, "Could not load bookings") });
    }
  },

  setBucket: async (organizationId, bucket) => {
    set({ bucket, page: 0 });
    await get().load(organizationId);
  },

  setQuery: (query) => set({ query }),

  search: async (organizationId) => {
    set({ page: 0 });
    await get().load(organizationId);
  },

  goToPage: async (organizationId, page) => {
    set({ page: Math.max(0, page) });
    await get().load(organizationId);
  },

  select: async (organizationId, bookingId) => {
    if (!bookingId) {
      set({ selected: null, selectedError: null, actionError: null });
      return;
    }
    const cached = get().items.find((b) => b.id === bookingId) ?? null;
    set({ selected: cached, selectedLoading: !cached, selectedError: null, actionError: null });
    try {
      const booking = await container.loadBookingUseCase.execute(organizationId, bookingId);
      set({ selected: booking, selectedLoading: false });
    } catch (error) {
      set({ selectedLoading: false, selectedError: messageOf(error, "Could not load this booking") });
    }
  },

  act: async (organizationId, action) => {
    const selected = get().selected;
    if (!selected) return;
    set({ actionBusy: true, actionError: null });
    try {
      const updated = await container.updateBookingStatusUseCase.execute(organizationId, selected.id, action);
      set((state) => ({
        selected: updated,
        actionBusy: false,
        items: state.items.map((b) => (b.id === updated.id ? updated : b)),
      }));
    } catch (error) {
      set({ actionBusy: false, actionError: messageOf(error, "Could not update this booking") });
    }
  },
}));
