import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { PartnerScope } from "../domain/workspace/workspace";
import type { Inquiry, InquiryStatus } from "../domain/inquiries/inquiry";
import { confirmationTimes, localInstant, type PartnerViewingAction, type Viewing } from "../domain/viewings/viewing";

interface EngagementState {
  scopeKey: string | null;
  scope: PartnerScope | null;
  inquiries: readonly Inquiry[];
  inquiriesLoaded: boolean;
  inquiriesError: string | null;
  viewings: readonly Viewing[];
  viewingsLoaded: boolean;
  viewingsError: string | null;
  selectedInquiryId: string | null;
  selectedViewingId: string | null;
  busyId: string | null;
  actionError: string | null;
  lostReason: string;
  viewingNote: string;
  viewingDate: string;
  viewingTime: string;
  view: "board" | "list";
  viewingFilter: "upcoming" | "past";
  now: number;
  unsubscribe: (() => void) | null;

  start: (scope: PartnerScope) => Promise<void>;
  stop: () => void;
  loadInquiries: () => Promise<void>;
  loadViewings: () => Promise<void>;
  selectInquiry: (id: string | null) => void;
  selectViewing: (id: string | null) => void;
  setLostReason: (value: string) => void;
  setViewingNote: (value: string) => void;
  setViewingDate: (value: string) => void;
  setViewingTime: (value: string) => void;
  setView: (view: "board" | "list") => void;
  setViewingFilter: (filter: "upcoming" | "past") => void;
  move: (inquiry: Inquiry, status: InquiryStatus) => Promise<void>;
  act: (viewing: Viewing, action: PartnerViewingAction) => Promise<void>;
}

const keyOf = (scope: PartnerScope) => (scope.kind === "OWNER" ? `org:${scope.organizationId}` : `agent:${scope.agentId}`);
const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

let lifetime = 0;
let inquiriesRequest = 0;
let viewingsRequest = 0;

export const useEngagementStore = create<EngagementState>((set, get) => ({
  scopeKey: null,
  scope: null,
  inquiries: [],
  inquiriesLoaded: false,
  inquiriesError: null,
  viewings: [],
  viewingsLoaded: false,
  viewingsError: null,
  selectedInquiryId: null,
  selectedViewingId: null,
  busyId: null,
  actionError: null,
  lostReason: "",
  viewingNote: "",
  viewingDate: "",
  viewingTime: "",
  view: "board",
  viewingFilter: "upcoming",
  now: Date.now(),
  unsubscribe: null,

  start: async (scope) => {
    const scopeKey = keyOf(scope);
    if (get().scopeKey === scopeKey && get().unsubscribe) return;
    get().stop();
    const generation = lifetime;
    set({ scope, scopeKey });
    const unsubscribe = container.watchActivityUseCase.execute(scope, (table) => {
      if (generation !== lifetime) return;
      if (table === "inquiries") void get().loadInquiries();
      else void get().loadViewings();
    });
    set({ scope, scopeKey, unsubscribe, inquiries: [], viewings: [], inquiriesLoaded: false, viewingsLoaded: false });
    await Promise.all([get().loadInquiries(), get().loadViewings()]);
  },

  stop: () => {
    ++lifetime;
    ++inquiriesRequest;
    ++viewingsRequest;
    get().unsubscribe?.();
    set({
      unsubscribe: null, scopeKey: null, scope: null,
      inquiries: [], viewings: [], inquiriesLoaded: false, viewingsLoaded: false,
      inquiriesError: null, viewingsError: null,
      selectedInquiryId: null, selectedViewingId: null, busyId: null, actionError: null,
      lostReason: "", viewingNote: "", viewingDate: "", viewingTime: "",
    });
  },

  loadInquiries: async () => {
    const generation = lifetime;
    const version = ++inquiriesRequest;
    const scope = get().scope;
    if (!scope) return;
    try {
      const inquiries = await container.loadInquiriesUseCase.execute(scope);
      if (generation !== lifetime || version !== inquiriesRequest || get().scopeKey !== keyOf(scope)) return;
      set({ inquiries, inquiriesLoaded: true, inquiriesError: null });
    } catch (error) {
      if (generation !== lifetime || version !== inquiriesRequest || get().scopeKey !== keyOf(scope)) return;
      set({ inquiriesLoaded: true, inquiriesError: messageOf(error, "Could not load inquiries") });
    }
  },

  loadViewings: async () => {
    const generation = lifetime;
    const version = ++viewingsRequest;
    const scope = get().scope;
    if (!scope) return;
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const viewings = await container.loadViewingsUseCase.execute(scope, { from });
      if (generation !== lifetime || version !== viewingsRequest || get().scopeKey !== keyOf(scope)) return;
      set({ viewings, viewingsLoaded: true, viewingsError: null, now: Date.now() });
    } catch (error) {
      if (generation !== lifetime || version !== viewingsRequest || get().scopeKey !== keyOf(scope)) return;
      set({ viewingsLoaded: true, viewingsError: messageOf(error, "Could not load viewings") });
    }
  },

  selectInquiry: (selectedInquiryId) => set({ selectedInquiryId, actionError: null, lostReason: "" }),
  selectViewing: (selectedViewingId) => {
    const viewing = get().viewings.find((v) => v.id === selectedViewingId);
    const times = confirmationTimes(viewing?.preferredTimeWindow ?? null);
    set({
      selectedViewingId,
      actionError: null,
      viewingNote: "",
      viewingDate: viewing?.preferredDate ?? "",
      viewingTime: times[Math.min(4, times.length - 1)] ?? "",
      now: Date.now(),
    });
  },
  setLostReason: (lostReason) => set({ lostReason }),
  setViewingNote: (viewingNote) => set({ viewingNote }),
  setViewingDate: (viewingDate) => set({ viewingDate }),
  setViewingTime: (viewingTime) => set({ viewingTime }),
  setView: (view) => set({ view }),
  setViewingFilter: (viewingFilter) => set({ viewingFilter, selectedViewingId: null, now: Date.now() }),

  move: async (inquiry, status) => {
    const generation = lifetime;
    const scope = get().scope;
    if (!scope) return;
    set({ busyId: inquiry.id, actionError: null });
    try {
      const updated = await container.moveInquiryUseCase.execute(scope, inquiry, status, get().lostReason.trim() || null);
      if (generation !== lifetime) return;
      set((state) => ({ busyId: null, lostReason: "", inquiries: state.inquiries.map((i) => (i.id === updated.id ? updated : i)) }));
    } catch (error) {
      if (generation !== lifetime) return;
      set({ busyId: null, actionError: messageOf(error, "Could not move that lead") });
    }
  },

  act: async (viewing, action) => {
    const generation = lifetime;
    const scope = get().scope;
    if (!scope) return;
    const { viewingDate, viewingTime } = get();
    const needsTime = action === "CONFIRM" || action === "REQUEST_RESCHEDULE";
    const scheduledAt = needsTime && viewingDate && viewingTime ? localInstant(viewingDate, viewingTime) : null;
    set({ busyId: viewing.id, actionError: null });
    try {
      const updated = await container.viewingActionUseCase.execute(scope, viewing.id, {
        action,
        scheduledAt,
        note: get().viewingNote.trim() || null,
      });
      if (generation !== lifetime) return;
      set((state) => ({
        busyId: null,
        viewingNote: "",
        selectedViewingId: action === "DECLINE" ? null : state.selectedViewingId,
        viewings:
          action === "DECLINE" && scope.kind === "AGENT"
            ? state.viewings.filter((v) => v.id !== updated.id)
            : state.viewings.map((v) => (v.id === updated.id ? updated : v)),
      }));
      void get().loadInquiries();
    } catch (error) {
      if (generation !== lifetime) return;
      set({ busyId: null, actionError: messageOf(error, "That didn't go through") });
    }
  },

}));
