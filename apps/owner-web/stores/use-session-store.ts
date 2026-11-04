import { create } from "zustand";
import { container } from "../infrastructure/composition/owner-web-container";
import type {
  ActiveSession,
  OrganizationMembership,
  UserProfile,
} from "../domain/session/session";
import {
  scopeOf,
  type AgentSummary,
  type PartnerScope,
  type Workspace,
} from "../domain/workspace/workspace";

export type AuthStatus =
  "loading" | "authenticated" | "unauthenticated" | "error";

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
  workspaceBusy: boolean;
  workspaceError: string | null;

  initialize: () => Promise<void>;
  watchIdentity: () => () => void;
  signOut: () => Promise<void>;
  setActiveOrganizationId: (orgId: string) => Promise<boolean>;
  setWorkspace: (key: string) => Promise<boolean>;
  reload: () => Promise<void>;
  setSignInEmail: (email: string) => void;
  setSignInPassword: (password: string) => void;
  toggleShowPassword: () => void;
  setSignInProblem: (problem: string | null) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  submitSignIn: () => Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stateFor(
  session: ActiveSession,
  preferredKey: string | null = session.activeWorkspaceKey,
) {
  const activeWorkspace =
    session.workspaces.find((w) => w.key === preferredKey) ?? null;
  return {
    user: session.user,
    memberships: session.memberships,
    workspaces: session.workspaces,
    agent: session.agent,
    activeWorkspace,
    scope: activeWorkspace ? scopeOf(activeWorkspace) : null,
    activeOrganizationId:
      activeWorkspace?.kind === "OWNER" ? activeWorkspace.organizationId : null,
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

export const useSessionStore = create<SessionState>((set, get) => {
  let lifetime = 0;
  let refreshRequest = 0;
  let switchRequest = 0;
  return {
    status: "loading",
    ...signedOut,
    error: null,
    signInEmail: "",
    signInPassword: "",
    showPassword: false,
    signInProblem: null,
    signInBusy: false,
    mobileDrawerOpen: false,
    workspaceBusy: false,
    workspaceError: null,

    setSignInEmail: (signInEmail) => set({ signInEmail, signInProblem: null }),
    setSignInPassword: (signInPassword) =>
      set({ signInPassword, signInProblem: null }),
    toggleShowPassword: () =>
      set((state) => ({ showPassword: !state.showPassword })),
    setSignInProblem: (signInProblem) => set({ signInProblem }),
    setMobileDrawerOpen: (mobileDrawerOpen) => set({ mobileDrawerOpen }),

    watchIdentity: () =>
      container.watchSessionUseCase.execute((userId) => {
        if (get().status !== "authenticated") return;
        if (!userId) {
          ++lifetime;
          set({
            status: "unauthenticated",
            ...signedOut,
            mobileDrawerOpen: false,
            workspaceBusy: false,
            workspaceError: null,
          });
        } else if (get().user?.id !== userId) {
          void get().initialize();
        } else {
          void get()
            .reload()
            .catch(() => get().initialize());
        }
      }),

    initialize: async () => {
      const request = ++lifetime;
      set({
        status: "loading",
        error: null,
        ...signedOut,
        workspaceBusy: false,
        workspaceError: null,
      });
      try {
        const session = await container.getCurrentSessionUseCase.execute();
        if (request !== lifetime) return;
        if (session) {
          set({ status: "authenticated", ...stateFor(session) });
        } else {
          set({ status: "unauthenticated", ...signedOut });
        }
      } catch (error) {
        if (request !== lifetime) return;
        set({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Could not restore your session",
        });
      }
    },

    submitSignIn: async () => {
      if (get().signInBusy) return;
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
      const request = ++lifetime;
      set({ signInBusy: true, signInProblem: null });
      try {
        const session = await container.signInUseCase.execute(email, password);
        if (request !== lifetime) return;
        set({
          status: "authenticated",
          ...stateFor(session),
          signInBusy: false,
          signInEmail: "",
          signInPassword: "",
          showPassword: false,
        });
      } catch (error) {
        if (request !== lifetime) return;
        set({
          signInBusy: false,
          signInProblem:
            error instanceof Error
              ? error.message
              : "We couldn’t sign you in. Please try again.",
        });
      }
    },

    signOut: async () => {
      ++lifetime;
      set({
        status: "unauthenticated",
        ...signedOut,
        error: null,
        signInPassword: "",
        signInProblem: null,
        signInBusy: false,
        mobileDrawerOpen: false,
        workspaceBusy: false,
        workspaceError: null,
      });
      await container.signOutUseCase.execute();
    },

    setActiveOrganizationId: (orgId) => get().setWorkspace(`owner:${orgId}`),

    setWorkspace: async (key) => {
      const accountId = get().user?.id;
      if (
        get().status !== "authenticated" ||
        !accountId ||
        !get().workspaces.some((w) => w.key === key)
      ) {
        set({
          workspaceError: "That workspace is not available to your account.",
        });
        return false;
      }
      const generation = lifetime;
      const request = ++switchRequest;
      ++refreshRequest;
      set({ workspaceBusy: true, workspaceError: null });
      try {
        const session = await container.refreshSessionUseCase.execute();
        if (generation !== lifetime || request !== switchRequest) return false;
        if (session.user.id !== accountId) {
          ++lifetime;
          set({
            status: "authenticated",
            ...stateFor(session),
            workspaceBusy: false,
            workspaceError:
              "Your account changed. Choose your workspace again.",
          });
          return false;
        }
        const workspace = session.workspaces.find((w) => w.key === key);
        if (!workspace) {
          set({
            ...stateFor(session, get().activeWorkspace?.key ?? null),
            workspaceBusy: false,
            workspaceError: "Your access to that workspace has changed.",
          });
          return false;
        }
        container.switchWorkspaceUseCase.execute(key);
        set({
          ...stateFor(session, key),
          workspaceBusy: false,
          workspaceError: null,
          mobileDrawerOpen: false,
        });
        return true;
      } catch (error) {
        if (generation === lifetime && request === switchRequest)
          set({
            workspaceBusy: false,
            workspaceError:
              error instanceof Error
                ? error.message
                : "Could not verify workspace access. Please try again.",
          });
        return false;
      }
    },

    reload: async () => {
      if (get().workspaceBusy) return;
      const currentLifetime = lifetime;
      const request = ++refreshRequest;
      try {
        const session = await container.refreshSessionUseCase.execute();
        if (currentLifetime !== lifetime || request !== refreshRequest) return;
        const preferred = get().activeWorkspace?.key ?? null;
        const keep = session.workspaces.some((w) => w.key === preferred)
          ? preferred
          : session.activeWorkspaceKey;
        set({ status: "authenticated", ...stateFor(session, keep) });
      } catch (error) {
        if (currentLifetime !== lifetime || request !== refreshRequest) return;
        throw error;
      }
    },
  };
});
