/**
 * Presentation Store: useSessionStore
 *
 * Orchestrates user authentication and dynamic tenant organization context.
 *
 * Rules:
 * - NO hardcoded organization IDs or mock fallbacks.
 * - Calls Use Cases via Composition Root container.
 */

import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type {
  OrganizationMembership,
  UserProfile,
} from "../domain/session/session";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface SessionState {
  status: AuthStatus;
  user: UserProfile | null;
  activeOrganizationId: string | null;
  memberships: readonly OrganizationMembership[];
  error: string | null;

  // Sign-in form state
  signInEmail: string;
  signInPassword: string;
  signInProblem: string | null;
  signInBusy: boolean;

  // Mobile Shell UI state
  mobileDrawerOpen: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setActiveOrganizationId: (orgId: string) => void;
  setSignInEmail: (email: string) => void;
  setSignInPassword: (password: string) => void;
  setSignInProblem: (problem: string | null) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  submitSignIn: (onSuccess?: () => void) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "loading",
  user: null,
  activeOrganizationId: null,
  memberships: [],
  error: null,

  signInEmail: "",
  signInPassword: "",
  signInProblem: null,
  signInBusy: false,

  mobileDrawerOpen: false,

  setSignInEmail: (signInEmail) => set({ signInEmail }),
  setSignInPassword: (signInPassword) => set({ signInPassword }),
  setSignInProblem: (signInProblem) => set({ signInProblem }),
  setMobileDrawerOpen: (mobileDrawerOpen) => set({ mobileDrawerOpen }),

  initialize: async () => {
    set({ status: "loading", error: null });
    try {
      const session = await container.getCurrentSessionUseCase.execute();
      if (session) {
        set({
          status: "authenticated",
          user: session.user,
          activeOrganizationId: session.activeOrganizationId,
          memberships: session.memberships,
          error: null,
        });
      } else {
        set({
          status: "unauthenticated",
          user: null,
          activeOrganizationId: null,
          memberships: [],
          error: null,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initialize session";
      set({
        status: "unauthenticated",
        user: null,
        activeOrganizationId: null,
        memberships: [],
        error: message,
      });
    }
  },

  signIn: async (email: string, pass: string) => {
    set({ error: null });
    try {
      const session = await container.signInUseCase.execute(email, pass);
      set({
        status: "authenticated",
        user: session.user,
        activeOrganizationId: session.activeOrganizationId,
        memberships: session.memberships,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      set({ status: "unauthenticated", error: message });
      return false;
    }
  },

  submitSignIn: async (onSuccess?: () => void) => {
    const { signInEmail, signInPassword, signIn } = get();
    if (!signInEmail.trim() || !signInPassword) {
      set({ signInProblem: "Please enter both email and password." });
      return;
    }

    set({ signInBusy: true, signInProblem: null });
    const success = await signIn(signInEmail.trim(), signInPassword);
    set({ signInBusy: false });

    if (success) {
      set({ signInEmail: "", signInPassword: "", signInProblem: null });
      onSuccess?.();
    } else {
      const errorMsg = get().error;
      set({ signInProblem: errorMsg ?? "Sign-in failed. Please check your credentials." });
    }
  },

  signOut: async () => {
    try {
      await container.signOutUseCase.execute();
    } finally {
      set({
        status: "unauthenticated",
        user: null,
        activeOrganizationId: null,
        memberships: [],
        error: null,
        signInEmail: "",
        signInPassword: "",
        signInProblem: null,
        signInBusy: false,
      });
    }
  },

  setActiveOrganizationId: (orgId: string) => {
    const isMember = get().memberships.some((m) => m.organizationId === orgId);
    if (isMember) {
      set({ activeOrganizationId: orgId });
    }
  },
}));
