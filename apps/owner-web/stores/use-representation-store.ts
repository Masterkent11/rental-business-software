import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { PublicAgent, Representation } from "../domain/agents/agent";
import type { AgentPermissions } from "../domain/listings/listing";
import { DEFAULT_PERMISSIONS } from "../domain/agents/permissions";

interface RepresentationState {
  organizationId: string | null;
  items: readonly Representation[];
  loading: boolean;
  error: string | null;
  query: string;
  results: readonly PublicAgent[];
  searching: boolean;
  searchError: string | null;
  permissions: AgentPermissions;
  busy: boolean;
  actionError: string | null;
  confirmEndId: string | null;

  askEnd: (id: string | null) => void;
  load: (organizationId: string) => Promise<void>;
  setQuery: (query: string) => void;
  search: () => Promise<void>;
  setPermission: (key: keyof AgentPermissions, value: boolean) => void;
  invite: (listingId: string, agentId: string) => Promise<boolean>;
  end: (representationId: string, reason: string | null) => Promise<void>;
  savePermissions: (representationId: string, permissions: AgentPermissions) => Promise<void>;
}

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export const currentFor = (items: readonly Representation[], listingId: string) =>
  items.find((r) => r.listingId === listingId && r.state !== "ENDED") ?? null;

export const useRepresentationStore = create<RepresentationState>((set, get) => ({
  organizationId: null,
  items: [],
  loading: false,
  error: null,
  query: "",
  results: [],
  searching: false,
  searchError: null,
  permissions: DEFAULT_PERMISSIONS,
  busy: false,
  actionError: null,
  confirmEndId: null,

  askEnd: (confirmEndId) => set({ confirmEndId, actionError: null }),

  load: async (organizationId) => {
    set({ organizationId, loading: get().items.length === 0 || get().organizationId !== organizationId, error: null });
    try {
      const items = await container.loadOrganizationRepresentationsUseCase.execute(organizationId);
      set({ items, loading: false });
    } catch (error) {
      set({ loading: false, error: messageOf(error, "Could not load agents") });
    }
  },

  setQuery: (query) => set({ query }),

  search: async () => {
    const organizationId = get().organizationId;
    if (!organizationId) return;
    set({ searching: true, searchError: null });
    try {
      const q = get().query.trim();
      const results = await container.searchAgentsUseCase.execute(organizationId, q ? { q } : {});
      set({ results, searching: false });
    } catch (error) {
      set({ searching: false, searchError: messageOf(error, "Could not search agents") });
    }
  },

  setPermission: (key, value) => set((state) => ({ permissions: { ...state.permissions, [key]: value } })),

  invite: async (listingId, agentId) => {
    const organizationId = get().organizationId;
    if (!organizationId) return false;
    set({ busy: true, actionError: null });
    try {
      const representation = await container.inviteAgentUseCase.execute(organizationId, listingId, agentId, get().permissions);
      set((state) => ({ busy: false, items: [representation, ...state.items], results: [], query: "" }));
      return true;
    } catch (error) {
      set({ busy: false, actionError: messageOf(error, "Could not invite that agent") });
      return false;
    }
  },

  end: async (representationId, reason) => {
    const organizationId = get().organizationId;
    if (!organizationId) return;
    set({ busy: true, actionError: null });
    try {
      const updated = await container.endRepresentationUseCase.execute({ kind: "OWNER", organizationId }, representationId, reason);
      set((state) => ({ busy: false, confirmEndId: null, items: state.items.map((r) => (r.id === updated.id ? updated : r)) }));
    } catch (error) {
      set({ busy: false, actionError: messageOf(error, "Could not end the representation") });
    }
  },

  savePermissions: async (representationId, permissions) => {
    const organizationId = get().organizationId;
    if (!organizationId) return;
    set({ busy: true, actionError: null });
    try {
      const updated = await container.updateRepresentationPermissionsUseCase.execute(organizationId, representationId, permissions);
      set((state) => ({ busy: false, items: state.items.map((r) => (r.id === updated.id ? updated : r)) }));
    } catch (error) {
      set({ busy: false, actionError: messageOf(error, "Could not update permissions") });
    }
  },
}));
