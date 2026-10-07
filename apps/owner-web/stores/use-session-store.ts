import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { OrganizationMembership, UserProfile } from "../domain/session/session";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface SessionState {
  status: AuthStatus;
  user: UserProfile | null;
  activeOrganizationId: string | null;
  memberships: readonly OrganizationMembership[];
  error: string | null;
  signInEmail: string;
  signInPassword: string;
  showPassword: boolean;
  signInProblem: string | null;
  signInBusy: boolean;
  mobileDrawerOpen: boolean;

  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setActiveOrganizationId: (orgId: string) => void;
  setSignInEmail: (email: string) => void;
  setSignInPassword: (password: string) => void;
  toggleShowPassword: () => void;
  setSignInProblem: (problem: string | null) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  submitSignIn: () => Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "loading",
  user: null,
  activeOrganizationId: null,
  memberships: [],
  error: null,
  signInEmail: "",
  signInPassword: "",
  showPassword: false,
  signInProblem: null,
  signInBusy: false,
  mobileDrawerOpen: false,

  setSignInEmail: (signInEmail) => set({ signInEmail, signInProblem: null }),
  setSignInPassword: (signInPassword) => set({ signInPassword, signInProblem: null }),
  toggleShowPassword: () => set((state) => ({ showPassword: !state.showPassword })),
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
        });
      } else {
        set({ status: "unauthenticated", user: null, activeOrganizationId: null, memberships: [] });
      }
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Could not restore your session",
      });
    }
  },

  submitSignIn: async () => {
    const email = get().signInEmail.trim();
    const password = get().signInPassword;
    if (!EMAIL.test(email)) {
      set({ signInProblem: "Enter a valid email address." });
      return;
    }
    if (password.length < 6) {
      set({ signInProblem: "Enter your password (at least 6 characters)." });
      return;
    }
    set({ signInBusy: true, signInProblem: null });
    try {
      const session = await container.signInUseCase.execute(email, password);
      set({
        status: "authenticated",
        user: session.user,
        activeOrganizationId: session.activeOrganizationId,
        memberships: session.memberships,
        signInBusy: false,
        signInEmail: "",
        signInPassword: "",
        showPassword: false,
      });
    } catch (error) {
      set({
        signInBusy: false,
        signInProblem: error instanceof Error ? error.message : "Sign-in failed. Please try again.",
      });
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
        signInPassword: "",
        signInProblem: null,
        signInBusy: false,
      });
    }
  },

  setActiveOrganizationId: (orgId) => {
    if (!get().memberships.some((m) => m.organizationId === orgId)) return;
    container.switchOrganizationUseCase.execute(orgId);
    set({ activeOrganizationId: orgId });
  },
}));
