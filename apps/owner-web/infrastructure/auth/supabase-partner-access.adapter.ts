import { z } from "zod";
import type { PartnerAccessPort } from "../../application/ports/partner-access.port";
import type {
  RegistrationInput,
  WorkspaceSetup,
} from "../../domain/session/partner-access";
import { env } from "../config/env";
import { HttpClient, HttpError } from "../http/http-client";
import { supabaseBrowserClient } from "../supabase/browser-client";

function authFailure(message: string | undefined, fallback: string): Error {
  const text = (message ?? "").toLowerCase();
  if (text.includes("rate limit") || text.includes("too many"))
    return new Error("Too many attempts. Please wait and try again.");
  if (text.includes("password") && text.includes("weak"))
    return new Error("Choose a stronger password with at least 8 characters.");
  if (text.includes("already registered"))
    return new Error(
      "You may already have an account. Try signing in or resetting your password.",
    );
  return new Error(fallback);
}
const callbackResults = new Map<
  string,
  Promise<"workspace" | "onboarding" | "recovery">
>();
const callbackUrl = (next: string) =>
  `${window.location.origin}/auth/callback?next=${next}`;

export class SupabasePartnerAccessAdapter implements PartnerAccessPort {
  constructor(private readonly http: HttpClient) {}

  async register(input: RegistrationInput) {
    const { data, error } = await supabaseBrowserClient().auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: callbackUrl("onboarding"),
      },
    });
    if (error)
      throw authFailure(
        error.message,
        "We couldn't create your account. Please try again.",
      );
    if (!data.user)
      throw new Error("We couldn't create your account. Please try again.");
    return { confirmationRequired: !data.session };
  }

  async googleAvailable() {
    try {
      const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: env.supabasePublishableKey },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const data = z
        .object({
          external: z.object({ google: z.boolean() }),
        })
        .parse(await response.json());
      return data.external.google;
    } catch {
      throw new Error("Google sign in could not be checked.");
    }
  }

  async signInWithGoogle(next: "workspace" | "onboarding") {
    const { error } = await supabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    if (error)
      throw authFailure(
        error.message,
        "Google sign in is unavailable. Please use your email.",
      );
  }

  completeCallback(search: string) {
    const previous = callbackResults.get(search);
    if (previous) return previous;
    const result = this.exchangeCallback(search);
    callbackResults.set(search, result);
    return result;
  }

  private async exchangeCallback(
    search: string,
  ): Promise<"workspace" | "onboarding" | "recovery"> {
    const params = new URLSearchParams(search);
    if (params.has("error"))
      throw new Error(
        "This sign in link couldn't be completed. Please try again.",
      );
    const code = params.get("code");
    const token = params.get("token_hash");
    const flowId = params.get("sb_flow_id");
    const type = params.get("type");
    const auth = supabaseBrowserClient().auth;
    const result = code
      ? await auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined)
      : token && (type === "signup" || type === "email" || type === "recovery")
        ? await auth.verifyOtp({ token_hash: token, type })
        : null;
    if (!result || result.error || !result.data.session)
      throw new Error(
        "This link has expired or was already used. Please request a new one.",
      );
    const next = params.get("next");
    return type === "recovery" || next === "recovery"
      ? "recovery"
      : next === "onboarding"
        ? "onboarding"
        : "workspace";
  }

  async requestPasswordReset(email: string) {
    const { error } = await supabaseBrowserClient().auth.resetPasswordForEmail(
      email,
      { redirectTo: callbackUrl("recovery") },
    );
    if (error)
      throw authFailure(
        error.message,
        "We couldn't send the reset email. Please try again.",
      );
  }

  async updatePassword(password: string) {
    const { error } = await supabaseBrowserClient().auth.updateUser({
      password,
    });
    if (error)
      throw authFailure(
        error.message,
        "Your password couldn't be updated. Request a new reset link and try again.",
      );
  }

  async completeSetup(input: WorkspaceSetup) {
    if (input.role === "OWNER") {
      const data = z
        .object({ organizationId: z.string().uuid() })
        .parse(
          await this.http.request("/me/owner-workspace", {
            method: "POST",
            body: { workspaceName: input.workspaceName.trim() },
          }),
        );
      return `owner:${data.organizationId}`;
    }
    let current: unknown;
    try {
      current = await this.http.request<unknown>("/agent/profile");
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 404) throw error;
    }
    if (!current) {
      try {
        await this.http.request("/agent/profile", {
          method: "POST",
          body: {
            displayName: input.displayName.trim(),
            headline: input.headline.trim(),
            bio: "",
            photoUrl: null,
            licenseNumber: null,
            licenseAuthority: null,
            specialties: [],
            areasServed: input.area.trim() ? [input.area.trim()] : [],
            languages: [],
            publicState: "HIDDEN",
          },
        });
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 409) throw error;
        await this.http.request("/agent/profile");
      }
    }
    return "agent";
  }
}
