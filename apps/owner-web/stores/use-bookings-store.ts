import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { BookingAction, BookingBucket, OwnerBooking } from "../domain/bookings/booking";

const PAGE_SIZE = 20;

interface BookingsState {
  organizationId: string | null;
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

  reset: () => void;
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

let request = 0;
let selectionRequest = 0;
let actionRequest = 0;

export const useBookingsStore = create<BookingsState>((set, get) => ({
  organizationId: null,
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

  reset: () => {
    ++request;
    ++selectionRequest;
    ++actionRequest;
    set({ organizationId: null, items: [], total: 0, bucket: "ALL", query: "", page: 0,
      loading: false, loaded: false, error: null, selected: null,
      selectedLoading: false, selectedError: null, actionBusy: false, actionError: null });
  },
  load: async (organizationId) => {
    if (get().organizationId !== organizationId) get().reset();
    const version = ++request;
    const { bucket, query, page } = get();
    set({ organizationId, loading: true, error: null });
    try {
      const result = await container.loadBookingsUseCase.execute(organizationId, {
        ...(bucket !== "ALL" ? { bucket } : {}),
        ...(query.trim() ? { q: query.trim() } : {}),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (version !== request || get().organizationId !== organizationId) return;
      set({ items: result.items, total: result.total, loading: false, loaded: true });
    } catch (error) {
      if (version !== request || get().organizationId !== organizationId) return;
      set({ loading: false, error: messageOf(error, "Could not load bookings") });
    }
  },

  setBucket: async (organizationId, bucket) => {
    if (get().organizationId !== organizationId) get().reset();
    set({ organizationId, bucket, page: 0 });
    await get().load(organizationId);
  },

  setQuery: (query) => set({ query }),

  search: async (organizationId) => {
    if (get().organizationId !== organizationId) get().reset();
    set({ organizationId, page: 0 });
    await get().load(organizationId);
  },

  goToPage: async (organizationId, page) => {
    if (get().organizationId !== organizationId) get().reset();
    set({ organizationId, page: Math.max(0, page) });
    await get().load(organizationId);
  },

  select: async (organizationId, bookingId) => {
    if (get().organizationId !== organizationId) { get().reset(); set({ organizationId }); }
    const version = ++selectionRequest;
    ++actionRequest;
    set({ actionBusy: false });
    if (!bookingId) {
      set({ selected: null, selectedLoading: false, selectedError: null, actionError: null });
      return;
    }
    const cached = get().items.find((b) => b.id === bookingId) ?? null;
    set({ selected: cached, selectedLoading: !cached, selectedError: null, actionError: null });
    try {
      const booking = await container.loadBookingUseCase.execute(organizationId, bookingId);
      if (version !== selectionRequest || get().organizationId !== organizationId) return;
      set({ selected: booking, selectedLoading: false });
    } catch (error) {
      if (version !== selectionRequest || get().organizationId !== organizationId) return;
      set({ selectedLoading: false, selectedError: messageOf(error, "Could not load this booking") });
    }
  },

  act: async (organizationId, action) => {
    const version = ++actionRequest;
    if (get().organizationId !== organizationId) return;
    const selected = get().selected;
    if (!selected) return;
    set({ actionBusy: true, actionError: null });
    try {
      const updated = await container.updateBookingStatusUseCase.execute(organizationId, selected.id, action);
      if (version !== actionRequest || get().organizationId !== organizationId) return;
      set((state) => ({
        selected: updated,
        actionBusy: false,
        items: state.items.map((b) => (b.id === updated.id ? updated : b)),
      }));
    } catch (error) {
      if (version !== actionRequest || get().organizationId !== organizationId) return;
      set({ actionBusy: false, actionError: messageOf(error, "Could not update this booking") });
    }
  },
}));
