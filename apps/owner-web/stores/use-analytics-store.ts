import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { PartnerAnalytics } from "../domain/analytics/analytics";
import type { PartnerScope } from "../domain/workspace/workspace";

interface AnalyticsState {
  data: PartnerAnalytics | null;
  scopeKey: string | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
  load: (scope: PartnerScope) => Promise<void>;
}

let request = 0;

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  data: null,
  scopeKey: null,
  loading: false,
  error: null,
  reset: () => {
    ++request;
    set({ data: null, scopeKey: null, loading: false, error: null });
  },
  load: async (scope) => {
    const version = ++request;
    const key = scope.kind === "OWNER" ? `OWNER:${scope.organizationId}` : `AGENT:${scope.agentId}`;
    set({ loading: true, error: null, data: null, scopeKey: key });
    try {
      const data = await container.loadAnalyticsUseCase.execute(scope);
      if (version === request && get().scopeKey === key) set({ data, loading: false });
    } catch (error) {
      if (version === request && get().scopeKey === key) set({ loading: false, error: error instanceof Error ? error.message : "Could not load analytics" });
    }
  },
}));
