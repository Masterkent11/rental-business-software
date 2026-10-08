import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type { ActiveSession, OrganizationMembership, UserProfile } from "../domain/session/session";
import { scopeOf, type AgentSummary, type PartnerScope, type Workspace } from "../domain/workspace/workspace";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface SessionState {
  status: AuthStatus;
  user: UserProfile | null;
  activeOrganizationId: string | null;
  memberships: readonly OrganizationMembership[];
  workspaces: readonly Workspace[];
  activeWorkspace: Workspace | null;
  scope: PartnerScope | null;
  agent: AgentSummary | null;
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
  setWorkspace: (key: string) => void;
  reload: () => Promise<void>;
  setSignInEmail: (email: string) => void;
  setSignInPassword: (password: string) => void;
  toggleShowPassword: () => void;
  setSignInProblem: (problem: string | null) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  submitSignIn: () => Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stateFor(session: ActiveSession, preferredKey: string | null = session.activeWorkspaceKey) {
  const activeWorkspace = session.workspaces.find((w) => w.key === preferredKey) ?? null;
  return {
    user: session.user,
    memberships: session.memberships,
    workspaces: session.workspaces,
    agent: session.agent,
    activeWorkspace,
    scope: activeWorkspace ? scopeOf(activeWorkspace) : null,
    activeOrganizationId: activeWorkspace?.kind === "OWNER" ? activeWorkspace.organizationId : null,
  };
}

const signedOut = {
  user: null,
  activeOrganizationId: null,
  memberships: [],
  workspaces: [],
  activeWorkspace: null,
  scope: null,
  agent: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  status: "loading",
  ...signedOut,
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
        set({ status: "authenticated", ...stateFor(session) });
      } else {
        set({ status: "unauthenticated", ...signedOut });
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
        ...stateFor(session),
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
        ...signedOut,
        error: null,
        signInPassword: "",
        signInProblem: null,
        signInBusy: false,
      });
    }
  },

  setActiveOrganizationId: (orgId) => {
    get().setWorkspace(`owner:${orgId}`);
  },

  setWorkspace: (key) => {
    const workspace = get().workspaces.find((w) => w.key === key);
    if (!workspace) return;
    container.switchWorkspaceUseCase.execute(key);
    set({
      activeWorkspace: workspace,
      scope: scopeOf(workspace),
      activeOrganizationId: workspace.kind === "OWNER" ? workspace.organizationId : null,
      mobileDrawerOpen: false,
    });
  },

  reload: async () => {
    const preferred = get().activeWorkspace?.key ?? null;
    const session = await container.refreshSessionUseCase.execute();
    const keep = session.workspaces.some((w) => w.key === preferred) ? preferred : session.activeWorkspaceKey;
    set({ status: "authenticated", ...stateFor(session, keep) });
  },
}));
