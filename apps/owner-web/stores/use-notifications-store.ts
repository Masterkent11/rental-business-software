import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { AppNotification } from "../domain/notifications/notification";

interface NotificationsState {
  organizationId: string | null;
  items: readonly AppNotification[];
  unreadCount: number;
  open: boolean;
  latest: AppNotification | null;
  error: string | null;
  unsubscribe: (() => void) | null;

  start: (organizationId: string) => Promise<void>;
  stop: () => void;
  setOpen: (open: boolean) => void;
  markAllRead: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  organizationId: null,
  items: [],
  unreadCount: 0,
  open: false,
  latest: null,
  error: null,
  unsubscribe: null,

  start: async (organizationId) => {
    if (get().organizationId === organizationId && get().unsubscribe) return;
    get().stop();
    const unsubscribe = container.watchNotificationsUseCase.execute(organizationId, (notification) => {
      set((state) => ({
        items: [notification, ...state.items.filter((n) => n.id !== notification.id)].slice(0, 50),
        unreadCount: state.unreadCount + 1,
        latest: notification,
      }));
    });
    set({ organizationId, unsubscribe });
    try {
      const result = await container.loadNotificationsUseCase.execute(organizationId);
      set({ items: result.notifications, unreadCount: result.unreadCount, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not load notifications" });
    }
  },

  stop: () => {
    get().unsubscribe?.();
    set({ unsubscribe: null, organizationId: null, items: [], unreadCount: 0 });
  },

  setOpen: (open) => set({ open }),

  markAllRead: async () => {
    const organizationId = get().organizationId;
    if (!organizationId || get().unreadCount === 0) return;
    const now = new Date().toISOString();
    set((state) => ({ unreadCount: 0, items: state.items.map((n) => ({ ...n, readAt: n.readAt ?? now })) }));
    try {
      await container.markNotificationsReadUseCase.execute(organizationId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not mark notifications as read" });
    }
  },
}));
