import type { SessionPort } from "../../application/ports/session.port";
import {
  NotAnOwnerError,
  type ActiveSession,
  type OrganizationMembership,
} from "../../domain/session/session";
import { HttpClient } from "../http/http-client";
import { MeDtoSchema } from "../http/dto/owner.dto";
import { supabaseBrowserClient } from "../supabase/browser-client";

const ACTIVE_ORG_KEY = "owner-web.activeOrganizationId";

function friendlyAuthError(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid credentials")) {
    return "That email and password don't match an account.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email address first, then sign in.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (text.includes("fetch") || text.includes("network")) {
    return "Can't reach the sign-in service. Check your connection.";
  }
  return "Sign-in failed. Please try again.";
}

function rememberedOrganization(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export class SupabaseSessionAdapter implements SessionPort {
  constructor(private readonly http: HttpClient) {}

  async getCurrentSession(): Promise<ActiveSession | null> {
    const { data } = await supabaseBrowserClient().auth.getSession();
    if (!data.session) return null;
    try {
      return await this.resolveActiveSession();
    } catch (error) {
      if (error instanceof NotAnOwnerError) {
        await supabaseBrowserClient().auth.signOut();
        return null;
      }
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<ActiveSession> {
    const { data, error } = await supabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(friendlyAuthError(error?.message));
    try {
      return await this.resolveActiveSession();
    } catch (resolveError) {
      await supabaseBrowserClient().auth.signOut();
      throw resolveError;
    }
  }

  async signOut(): Promise<void> {
    this.forgetOrganization();
    await supabaseBrowserClient().auth.signOut();
  }

  private forgetOrganization(): void {
    try {
      window.localStorage.removeItem(ACTIVE_ORG_KEY);
    } catch {
      return;
    }
  }

  rememberOrganization(organizationId: string): void {
    try {
      window.localStorage.setItem(ACTIVE_ORG_KEY, organizationId);
    } catch {
      return;
    }
  }

  private async resolveActiveSession(): Promise<ActiveSession> {
    const me = MeDtoSchema.parse(await this.http.request<unknown>("/me"));
    const memberships: OrganizationMembership[] = me.organizations.map((o) => ({
      organizationId: o.id,
      role: o.role,
      organizationName: o.name,
      verified: o.verified,
    }));

    if (memberships.length === 0) {
      throw new NotAnOwnerError(
        "This account doesn't manage any properties. Sign in with an owner account, or use the customer app.",
      );
    }

    const remembered = rememberedOrganization();
    const activeOrganizationId =
      memberships.find((m) => m.organizationId === remembered)?.organizationId ?? memberships[0]!.organizationId;

    return {
      user: { id: me.id, displayName: me.displayName, ...(me.email ? { email: me.email } : {}) },
      activeOrganizationId,
      memberships,
      capabilities: me.capabilities,
    };
  }
}
