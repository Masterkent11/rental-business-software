/**
 * Presentation Store: useApplicationsStore
 *
 * Rules:
 * - Depends ONLY on Application Use Cases via Composition Root.
 * - NO concrete Infrastructure adapter imports.
 */

import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type {
  DecisionInput,
  OwnerApplication,
} from "../domain/applications/application";

interface ApplicationsState {
  applications: readonly OwnerApplication[];
  loading: boolean;
  error: string | null;
  busyId: string | null;
  rejectingApp: OwnerApplication | null;
  rejectReason: string;

  // Actions
  loadApplications: (organizationId: string) => Promise<void>;
  setRejectingApp: (app: OwnerApplication | null) => void;
  setRejectReason: (reason: string) => void;
  decide: (
    organizationId: string,
    application: OwnerApplication,
    input: DecisionInput,
  ) => Promise<boolean>;
}

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,
  busyId: null,
  rejectingApp: null,
  rejectReason: "",

  setRejectingApp: (rejectingApp) => set({ rejectingApp, rejectReason: "" }),
  setRejectReason: (rejectReason) => set({ rejectReason }),

  loadApplications: async (organizationId: string) => {
    set({ loading: true, error: null });
    try {
      const applications = await container.loadApplicationsUseCase.execute(organizationId);
      set({ applications, loading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load applications";
      set({ error: message, loading: false });
    }
  },

  decide: async (
    organizationId: string,
    application: OwnerApplication,
    input: DecisionInput,
  ) => {
    set({ busyId: application.id, error: null });
    try {
      await container.decideApplicationUseCase.execute(
        organizationId,
        application.id,
        input,
      );
      await get().loadApplications(organizationId);
      set({ busyId: null, rejectingApp: null, rejectReason: "" });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not record that decision";
      set({ error: message, busyId: null });
      return false;
    }
  },
}));
