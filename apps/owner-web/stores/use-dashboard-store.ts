/**
 * Presentation Store: useDashboardStore
 *
 * Rules:
 * - Depends ONLY on Application Use Cases via Composition Root.
 * - NO concrete Infrastructure adapter imports.
 */

import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { Collection } from "../domain/payments/collection";

interface DashboardState {
  collection: Collection | null;
  loading: boolean;
  error: string | null;

  loadCollection: (organizationId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  collection: null,
  loading: false,
  error: null,

  loadCollection: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const collection = await container.loadDashboardUseCase.execute(organizationId);
      set({ collection, loading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load collection data";
      set({ error: message, loading: false });
    }
  },
}));
