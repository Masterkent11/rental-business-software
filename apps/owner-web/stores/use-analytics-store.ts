import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { PartnerAnalytics } from "../domain/analytics/analytics";
import type { PartnerScope } from "../domain/workspace/workspace";

interface AnalyticsState {
  data: PartnerAnalytics | null;
  loading: boolean;
  error: string | null;
  load: (scope: PartnerScope) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  data: null,
  loading: false,
  error: null,
  load: async (scope) => {
    set({ loading: true, error: null });
    try {
      set({ data: await container.loadAnalyticsUseCase.execute(scope), loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not load analytics" });
    }
  },
}));
