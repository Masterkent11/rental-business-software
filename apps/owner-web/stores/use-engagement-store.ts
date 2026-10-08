import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { PartnerScope } from "../domain/workspace/workspace";
import type { Inquiry, InquiryStatus } from "../domain/inquiries/inquiry";
import type { PartnerViewingAction, Viewing } from "../domain/viewings/viewing";

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
  setView: (view: "board" | "list") => void;
  setViewingFilter: (filter: "upcoming" | "past") => void;
  move: (inquiry: Inquiry, status: InquiryStatus) => Promise<void>;
  act: (viewing: Viewing, action: PartnerViewingAction) => Promise<void>;
}

const keyOf = (scope: PartnerScope) => (scope.kind === "OWNER" ? `org:${scope.organizationId}` : `agent:${scope.agentId}`);
const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

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
  view: "board",
  viewingFilter: "upcoming",
  now: Date.now(),
  unsubscribe: null,

  start: async (scope) => {
    const scopeKey = keyOf(scope);
    if (get().scopeKey === scopeKey && get().unsubscribe) return;
    get().stop();
    const unsubscribe = container.watchActivityUseCase.execute(scope, (table) => {
      if (table === "inquiries") void get().loadInquiries();
      else void get().loadViewings();
    });
    set({ scope, scopeKey, unsubscribe, inquiries: [], viewings: [], inquiriesLoaded: false, viewingsLoaded: false });
    await Promise.all([get().loadInquiries(), get().loadViewings()]);
  },

  stop: () => {
    get().unsubscribe?.();
    set({ unsubscribe: null, scopeKey: null, scope: null });
  },

  loadInquiries: async () => {
    const scope = get().scope;
    if (!scope) return;
    try {
      const inquiries = await container.loadInquiriesUseCase.execute(scope);
      set({ inquiries, inquiriesLoaded: true, inquiriesError: null });
    } catch (error) {
      set({ inquiriesLoaded: true, inquiriesError: messageOf(error, "Could not load inquiries") });
    }
  },

  loadViewings: async () => {
    const scope = get().scope;
    if (!scope) return;
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const viewings = await container.loadViewingsUseCase.execute(scope, { from });
      set({ viewings, viewingsLoaded: true, viewingsError: null, now: Date.now() });
    } catch (error) {
      set({ viewingsLoaded: true, viewingsError: messageOf(error, "Could not load viewings") });
    }
  },

  selectInquiry: (selectedInquiryId) => set({ selectedInquiryId, actionError: null, lostReason: "" }),
  selectViewing: (selectedViewingId) => set({ selectedViewingId, actionError: null, viewingNote: "", now: Date.now() }),
  setLostReason: (lostReason) => set({ lostReason }),
  setViewingNote: (viewingNote) => set({ viewingNote }),
  setView: (view) => set({ view }),
  setViewingFilter: (viewingFilter) => set({ viewingFilter, selectedViewingId: null, now: Date.now() }),

  move: async (inquiry, status) => {
    const scope = get().scope;
    if (!scope) return;
    set({ busyId: inquiry.id, actionError: null });
    try {
      const updated = await container.moveInquiryUseCase.execute(scope, inquiry, status, get().lostReason.trim() || null);
      set((state) => ({ busyId: null, lostReason: "", inquiries: state.inquiries.map((i) => (i.id === updated.id ? updated : i)) }));
    } catch (error) {
      set({ busyId: null, actionError: messageOf(error, "Could not move that lead") });
    }
  },

  act: async (viewing, action) => {
    const scope = get().scope;
    if (!scope) return;
    set({ busyId: viewing.id, actionError: null });
    try {
      const updated = await container.viewingActionUseCase.execute(scope, viewing.id, action, get().viewingNote.trim() || null);
      set((state) => ({ busyId: null, viewingNote: "", viewings: state.viewings.map((v) => (v.id === updated.id ? updated : v)) }));
      void get().loadInquiries();
    } catch (error) {
      set({ busyId: null, actionError: messageOf(error, "That didn't go through") });
    }
  },
}));
