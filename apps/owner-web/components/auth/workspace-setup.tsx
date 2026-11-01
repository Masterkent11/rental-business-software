"use client";

import { useAuthDraft } from "./use-auth-draft";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, UserRound } from "lucide-react";
import { partnerRole, type PartnerRole } from "@/domain/session/partner-access";
import { container } from "@/infrastructure/composition/owner-web-container";
import {
  clearPartnerRole,
  savedPartnerRole,
} from "@/infrastructure/auth/partner-onboarding-storage";
import { useSessionStore } from "@/stores/use-session-store";
import {
  AuthError,
  AuthField,
  AuthFrame,
  AuthLoading,
  AuthSubmit,
} from "./auth-layout";
import { useAuthAction } from "./use-auth-action";

export function WorkspaceSetup() {
  const router = useRouter();
  const state = useSessionStore();
  const action = useAuthAction();
  const [role, setRole] = useAuthDraft<PartnerRole | null>(null);
  const [workspaceName, setWorkspaceName] = useAuthDraft("");
  const [displayName, setDisplayName] = useAuthDraft("");
  const [headline, setHeadline] = useAuthDraft("");
  const [area, setArea] = useAuthDraft("");
  useEffect(() => {
    const selected = partnerRole(savedPartnerRole());
    setRole(selected);
    if (!selected) router.replace("/onboarding/role");
    if (state.status === "unauthenticated")
      router.replace(
        selected ? `/sign-up?role=${selected}` : "/onboarding/role",
      );
    if (state.user?.displayName) setDisplayName(state.user.displayName);
  }, [router, state.status, state.user?.displayName, setRole, setDisplayName]);
  const owner = role === "OWNER";
  return (
    <AuthFrame
      title={owner ? "Set up your workspace" : "Set up your agent profile"}
      description={
        owner
          ? "Give your property workspace a name. You can add your first property next."
          : "Introduce yourself to the people you’ll work with."
      }
      step={3}
      back="/onboarding/role"
    >
      {state.status === "loading" || !role ? (
        <AuthLoading />
      ) : state.status === "error" ? (
        <>
          <AuthError message={state.error} />
          <button
            type="button"
            className="auth-text-link"
            onClick={() => void state.initialize()}
          >
            Try again
          </button>
        </>
      ) : (
        <form
          className="auth-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              const key = await container.completePartnerSetup.execute({
                role,
                workspaceName,
                displayName,
                headline: headline || "Real estate agent",
                area,
              });
              await useSessionStore.getState().reload();
              if (
                !useSessionStore
                  .getState()
                  .workspaces.some((w) => w.key === key)
              )
                throw new Error(
                  "Your workspace is not available yet. Please try again.",
                );
              if (!await useSessionStore.getState().setWorkspace(key)) throw new Error("Your workspace could not be verified. Please try again.");
              clearPartnerRole();
              router.replace(owner ? "/" : "/agent");
            });
          }}
        >
          {owner ? (
            <AuthField
              label="Workspace name"
              icon={<Building2 />}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Santos Properties"
              autoComplete="organization"
              maxLength={80}
              required
            />
          ) : (
            <>
              <AuthField
                label="Professional name"
                icon={<UserRound />}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                maxLength={80}
                required
              />
              <AuthField
                label="Headline (optional)"
                icon={<Building2 />}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Cebu real estate agent"
                maxLength={80}
              />
              <AuthField
                label="Area served (optional)"
                icon={<MapPin />}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Cebu City"
                maxLength={60}
              />
            </>
          )}
          <p className="auth-setup-note">
            {owner
              ? "Your workspace starts as a draft. Verification is required before you publish listings."
              : "Your profile starts private and unverified. You can add credentials and request verification from your workspace."}
          </p>
          <AuthError message={action.error} />
          <AuthSubmit busy={action.busy}>
            {action.busy
              ? "Setting up…"
              : owner
                ? "Create workspace"
                : "Create agent profile"}
          </AuthSubmit>
          <Link className="auth-text-link" href="/onboarding/role">
            Change role
          </Link>
          <button
            type="button"
            className="auth-text-link"
            onClick={() => void state.signOut()}
          >
            Sign out
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
