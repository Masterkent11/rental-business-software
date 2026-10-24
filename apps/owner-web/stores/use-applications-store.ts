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
  organizationId: string | null;
  applications: readonly OwnerApplication[];
  loading: boolean;
  error: string | null;
  busyId: string | null;
  rejectingApp: OwnerApplication | null;
  rejectReason: string;
  confirmingId: string | null;
  requirementsReviewed: boolean;
  setConfirmingId: (id: string | null) => void;
  setRequirementsReviewed: (value: boolean) => void;

  // Actions
  loadApplications: (organizationId: string) => Promise<void>;
  setRejectingApp: (app: OwnerApplication | null) => void;
  setRejectReason: (reason: string) => void;
  decide: (
    organizationId: string,
    application: OwnerApplication,
    input: DecisionInput,
  ) => Promise<boolean>;
  confirmTenancy: (organizationId: string, applicationId: string, reviewed: boolean) => Promise<boolean>;
}

let loadVersion = 0;

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  organizationId: null,
  applications: [],
  loading: false,
  error: null,
  busyId: null,
  rejectingApp: null,
  rejectReason: "",
  confirmingId: null,
  requirementsReviewed: false,
  setConfirmingId: (confirmingId) => set({ confirmingId, requirementsReviewed: false }),
  setRequirementsReviewed: (requirementsReviewed) => set({ requirementsReviewed }),

  setRejectingApp: (rejectingApp) => set({ rejectingApp, rejectReason: "" }),
  setRejectReason: (rejectReason) => set({ rejectReason }),
  confirmTenancy: async (organizationId, applicationId, reviewed) => {
    if (get().busyId || get().organizationId !== organizationId) return false;
    set({ busyId: applicationId, error: null });
    try {
      await container.confirmTenancyUseCase.execute(organizationId, applicationId, reviewed);
      if (get().organizationId !== organizationId) return false;
      await get().loadApplications(organizationId);
      set({ busyId: null });
      return true;
    } catch (error) {
      if (get().organizationId !== organizationId) return false;
      set({ busyId: null, error: error instanceof Error ? error.message : "Could not confirm this tenancy" });
      return false;
    }
  },

  loadApplications: async (organizationId: string) => {
    const version = ++loadVersion;
    if (get().organizationId !== organizationId) {
      set({ organizationId, applications: [], busyId: null, confirmingId: null, requirementsReviewed: false, rejectingApp: null, rejectReason: "" });
    }
    set({ loading: true, error: null });
    try {
      const applications = await container.loadApplicationsUseCase.execute(organizationId);
      if (version !== loadVersion || get().organizationId !== organizationId) return;
      set({ applications, loading: false, error: null });
    } catch (err: unknown) {
      if (version !== loadVersion || get().organizationId !== organizationId) return;
      const message = err instanceof Error ? err.message : "Failed to load applications";
      set({ error: message, loading: false });
    }
  },

  decide: async (
    organizationId: string,
    application: OwnerApplication,
    input: DecisionInput,
  ) => {
    if (get().busyId || get().organizationId !== organizationId) return false;
    set({ busyId: application.id, error: null });
    try {
      await container.decideApplicationUseCase.execute(
        organizationId,
        application.id,
        input,
      );
      if (get().organizationId !== organizationId) return false;
      await get().loadApplications(organizationId);
      set({ busyId: null, rejectingApp: null, rejectReason: "" });
      return true;
    } catch (err: unknown) {
      if (get().organizationId !== organizationId) return false;
      const message = err instanceof Error ? err.message : "Could not record that decision";
      set({ error: message, busyId: null });
      return false;
    }
  },
}));
