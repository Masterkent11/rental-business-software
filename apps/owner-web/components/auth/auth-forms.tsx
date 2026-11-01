"use client";

import { useAuthDraft } from "./use-auth-draft";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { container } from "@/infrastructure/composition/owner-web-container";
import {
  clearPartnerRole,
  markPartnerVisit,
  rememberPartnerRole,
  savedPartnerRole,
} from "@/infrastructure/auth/partner-onboarding-storage";
import {
  partnerRole,
  registrationProblems,
  safePartnerReturn,
} from "@/domain/session/partner-access";
import { pathBelongsTo, workspaceHome } from "@/domain/workspace/workspace";
import { useSessionStore } from "@/stores/use-session-store";
import {
  AuthError,
  AuthField,
  AuthFrame,
  AuthLoading,
  AuthSubmit,
  GoogleMark,
  SuccessMessage,
} from "./auth-layout";
import { useAuthAction } from "./use-auth-action";

const emptyRegistration = { fullName: "", email: "", password: "" };
const emptyProblems: Record<string, string> = {};

function useAuthenticatedDestination() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, workspaces, activeWorkspace } = useSessionStore();
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!workspaces.length) {
      router.replace(
        savedPartnerRole() ? "/onboarding/setup" : "/onboarding/role",
      );
      return;
    }
    const destination = safePartnerReturn(params.get("returnTo"));
    router.replace(
      activeWorkspace && !pathBelongsTo(destination, activeWorkspace)
        ? workspaceHome(activeWorkspace)
        : destination,
    );
  }, [status, workspaces.length, activeWorkspace, router, params]);
}
function GoogleButton({ signup = false }: { signup?: boolean }) {
  const [available, setAvailable] = useAuthDraft<boolean | null>(null);
  const [checkError, setCheckError] = useAuthDraft<string | null>(null);
  const [attempt, setAttempt] = useAuthDraft(0);
  const action = useAuthAction();
  useEffect(() => {
    let current = true;
    setAvailable(null);
    setCheckError(null);
    void container.partnerAccess.googleAvailable()
      .then((value) => {
        if (current) setAvailable(value);
      })
      .catch(() => {
        if (current) setCheckError("Google sign in could not be checked.");
      });
    return () => {
      current = false;
    };
  }, [attempt, setAvailable, setCheckError]);
  if (available === false) return null;
  return (
    <>
      <button
        className="auth-google"
        type="button"
        disabled={action.busy || available !== true}
        aria-busy={action.busy || (available === null && !checkError)}
        onClick={() =>
          void action.run(async () => {
            markPartnerVisit();
            await container.partnerAccess.signInWithGoogle(
              signup ? "onboarding" : "workspace",
            );
          })
        }
      >
        <GoogleMark />
        {signup ? "Sign up with Google" : "Continue with Google"}
      </button>
      {checkError ? (
        <p role="status" className="mt-2 text-center text-xs">
          {checkError}{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </p>
      ) : null}
      <AuthError message={action.error} />
      <div className="auth-divider">
        <span />
        {signup ? "or continue with email" : "or sign in with email"}
        <span />
      </div>
    </>
  );
}
export function SignInForm() {
  useAuthenticatedDestination();
  const state = useSessionStore();
  useEffect(() => {
    markPartnerVisit();
  }, []);
  return (
    <AuthFrame
      title="Sign in to your workspace"
      description="Manage properties, bookings and client conversations in one place."
    >
      <GoogleButton />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void state.submitSignIn();
        }}
        className="auth-form"
      >
        <AuthField
          label="Email"
          icon={<Mail />}
          type="email"
          autoComplete="username"
          inputMode="email"
          value={state.signInEmail}
          onChange={(e) => state.setSignInEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <AuthField
          label="Password"
          labelAction={
            <Link className="auth-forgot" href="/forgot-password">
              Forgot password?
            </Link>
          }
          icon={<LockKeyhole />}
          type="password"
          autoComplete="current-password"
          value={state.signInPassword}
          onChange={(e) => state.setSignInPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <AuthError message={state.signInProblem} />
        <AuthSubmit busy={state.signInBusy}>
          {state.signInBusy ? "Signing in…" : "Sign in"}
        </AuthSubmit>
      </form>
      <p className="auth-footer">
        Don’t have an account?{" "}
        <Link href="/onboarding/role">Create account</Link>
      </p>
      <p className="auth-workspace-note">
        Owners and agents use the same account. Choose your workspace after
        signing in.
      </p>
    </AuthFrame>
  );
}
export function SignUpForm() {
  useAuthenticatedDestination();
  const router = useRouter();
  const params = useSearchParams();
  const action = useAuthAction();
  const [values, setValues] = useAuthDraft(emptyRegistration);
  const [problems, setProblems] =
    useAuthDraft<Record<string, string>>(emptyProblems);
  const [confirmation, setConfirmation] = useAuthDraft(false);
  useEffect(() => {
    const role = partnerRole(params.get("role")) ?? savedPartnerRole();
    if (!role) router.replace("/onboarding/role");
    else {
      rememberPartnerRole(role);
      markPartnerVisit();
    }
  }, [params, router]);
  function change(field: keyof typeof values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setProblems((p) => ({ ...p, [field]: "" }));
    action.setError(null);
  }
  return (
    <AuthFrame
      title="Create your account"
      description="List your property, manage bookings, and connect with guests."
      step={2}
      back="/onboarding/role"
    >
      {confirmation ? (
        <SuccessMessage title="Check your email">
          <p>
            Follow the confirmation link to finish setting up your account. Your
            workspace setup comes next.
          </p>
          <Link className="auth-text-link" href="/sign-in">
            Back to sign in
          </Link>
        </SuccessMessage>
      ) : (
        <>
          <GoogleButton signup />
          <form
            className="auth-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const errors = registrationProblems(values);
              setProblems(errors);
              if (Object.keys(errors).length) return;
              void action.run(async () => {
                const result = await container.registerPartner.execute(values);
                setValues((v) => ({ ...v, password: "" }));
                if (result.confirmationRequired) setConfirmation(true);
                else {
                  await useSessionStore.getState().initialize();
                  router.replace("/onboarding/setup");
                }
              });
            }}
          >
            <AuthField
              label="Full name"
              icon={<UserRound />}
              value={values.fullName}
              onChange={(e) => change("fullName", e.target.value)}
              autoComplete="name"
              maxLength={80}
              placeholder="Your full name"
              error={problems.fullName}
              required
            />
            <AuthField
              label="Email"
              icon={<Mail />}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={values.email}
              onChange={(e) => change("email", e.target.value)}
              placeholder="you@example.com"
              error={problems.email}
              required
            />
            <AuthField
              label="Password"
              icon={<LockKeyhole />}
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => change("password", e.target.value)}
              placeholder="At least 8 characters"
              error={problems.password}
              required
            />
            <AuthError message={action.error} />
            <AuthSubmit busy={action.busy}>
              {action.busy ? "Creating account…" : "Create account"}
            </AuthSubmit>
          </form>
          <p className="auth-footer auth-legal">
            By creating an account, you agree to our
            <br />
            <Link href="/legal/terms" target="_blank" rel="noopener">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" target="_blank" rel="noopener">
              Privacy Policy
            </Link>
            .
          </p>
          <p className="auth-mobile-login">
            Already have an account? <Link href="/sign-in">Sign in</Link>
          </p>
        </>
      )}
    </AuthFrame>
  );
}
export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const action = useAuthAction();
  const [value, setValue] = useAuthDraft("");
  const [complete, setComplete] = useAuthDraft(false);
  return (
    <AuthFrame
      title={reset ? "Choose a new password" : "Forgot your password?"}
      description={
        reset
          ? "Set a new password for your Westayplace account."
          : "We’ll send you a link to reset it."
      }
      back="/sign-in"
    >
      {complete ? (
        <SuccessMessage title={reset ? "Password updated" : "Check your email"}>
          <p>
            {reset
              ? "You can now sign in with your new password."
              : "If an account matches that email, you’ll receive a password reset link."}
          </p>
          <Link className="auth-text-link" href="/sign-in">
            Back to sign in
          </Link>
        </SuccessMessage>
      ) : (
        <form
          className="auth-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(async () => {
              if (reset) {
                await container.updatePartnerPassword.execute(value);
                await useSessionStore.getState().signOut();
                clearPartnerRole();
              } else await container.requestPartnerPasswordReset.execute(value);
              setValue("");
              setComplete(true);
            });
          }}
        >
          <AuthField
            label={reset ? "New password" : "Email"}
            icon={reset ? <LockKeyhole /> : <Mail />}
            type={reset ? "password" : "email"}
            autoComplete={reset ? "new-password" : "email"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={reset ? "At least 8 characters" : "you@example.com"}
            required
          />
          <AuthError message={action.error} />
          <AuthSubmit busy={action.busy}>
            {reset ? "Update password" : "Send reset link"}
          </AuthSubmit>
          <Link className="auth-text-link" href="/sign-in">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthFrame>
  );
}
export function AuthCallback() {
  const router = useRouter();
  const [problem, setProblem] = useAuthDraft<string | null>(null);
  useEffect(() => {
    let current = true;
    void container.partnerAccess
      .completeCallback(window.location.search)
      .then(async (next) => {
        if (!current) return;
        window.history.replaceState(null, "", "/auth/callback");
        markPartnerVisit();
        if (next === "recovery") {
          router.replace("/reset-password");
          return;
        }
        await useSessionStore.getState().initialize();
        if (current)
          router.replace(next === "onboarding" ? "/onboarding/setup" : "/");
      })
      .catch(() => {
        if (current) {
          window.history.replaceState(null, "", "/auth/callback");
          setProblem(
            "This link has expired or couldn't be completed. Please try signing in again.",
          );
        }
      });
    return () => {
      current = false;
    };
  }, [router, setProblem]);
  return (
    <AuthFrame
      title="Welcome to Westayplace"
      description="Finishing your sign in."
    >
      {problem ? (
        <>
          <AuthError message={problem} />
          <Link className="auth-text-link" href="/sign-in">
            Back to sign in
          </Link>
        </>
      ) : (
        <AuthLoading message="Confirming your account…" />
      )}
    </AuthFrame>
  );
}
