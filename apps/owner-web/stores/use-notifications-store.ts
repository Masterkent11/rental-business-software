import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { AppNotification } from "../domain/notifications/notification";
import type { PartnerScope } from "../domain/workspace/workspace";

interface NotificationsState {
  scope: PartnerScope | null;
  scopeKey: string | null;
  items: readonly AppNotification[];
  unreadCount: number;
  open: boolean;
  latest: AppNotification | null;
  error: string | null;
  unsubscribe: (() => void) | null;

  start: (scope: PartnerScope, userId: string) => Promise<void>;
  stop: () => void;
  setOpen: (open: boolean) => void;
  markAllRead: () => Promise<void>;
}

let lifetime = 0;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  scope: null,
  scopeKey: null,
  items: [],
  unreadCount: 0,
  open: false,
  latest: null,
  error: null,
  unsubscribe: null,

  start: async (scope, userId) => {
    const scopeKey = scope.kind === "OWNER" ? scope.organizationId : `agent:${scope.agentId}`;
    if (get().scopeKey === scopeKey && get().unsubscribe) return;
    get().stop();
    const generation = lifetime;
    const unsubscribe = container.watchNotificationsUseCase.execute(scope, userId, (notification) => {
      if (generation !== lifetime) return;
      set((state) => ({
        items: [notification, ...state.items.filter((n) => n.id !== notification.id)].slice(0, 50),
        unreadCount: state.unreadCount + 1,
        latest: notification,
      }));
    });
    set({ scope, scopeKey, unsubscribe });
    try {
      const result = await container.loadNotificationsUseCase.execute(scope);
      if (generation !== lifetime) return;
      set({ items: result.notifications, unreadCount: result.unreadCount, error: null });
    } catch (error) {
      if (generation !== lifetime) return;
      set({ error: error instanceof Error ? error.message : "Could not load notifications" });
    }
  },

  stop: () => {
    ++lifetime;
    get().unsubscribe?.();
    set({ unsubscribe: null, scope: null, scopeKey: null, items: [], unreadCount: 0, latest: null, error: null, open: false });
  },

  setOpen: (open) => set({ open }),

  markAllRead: async () => {
    const generation = lifetime;
    const scope = get().scope;
    if (!scope || get().unreadCount === 0) return;
    const now = new Date().toISOString();
    set((state) => ({ unreadCount: 0, items: state.items.map((n) => ({ ...n, readAt: n.readAt ?? now })) }));
    try {
      await container.markNotificationsReadUseCase.execute(scope);
    } catch (error) {
      if (generation !== lifetime) return;
      set({ error: error instanceof Error ? error.message : "Could not mark notifications as read" });
    }
  },
}));
