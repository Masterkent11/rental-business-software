import type { SessionPort } from "../../application/ports/session.port";
import type { ActiveSession, OrganizationMembership } from "../../domain/session/session";
import { chooseWorkspace, ownerKey, workspacesFor, type AgentSummary } from "../../domain/workspace/workspace";
import { HttpClient } from "../http/http-client";
import { MeDtoSchema } from "../http/dto/owner.dto";
import { supabaseBrowserClient } from "../supabase/browser-client";

const ACTIVE_WORKSPACE_KEY = "partner-portal.workspace";
const LEGACY_ORG_KEY = "owner-web.activeOrganizationId";

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
    return "Can't reach the sign in service. Check your connection.";
  }
  return "We couldn’t sign you in. Please try again.";
}

function rememberedWorkspace(): string | null {
  try {
    const current = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (current) return current;
    const legacy = window.localStorage.getItem(LEGACY_ORG_KEY);
    return legacy ? ownerKey(legacy) : null;
  } catch {
    return null;
  }
}

export class SupabaseSessionAdapter implements SessionPort {
  constructor(private readonly http: HttpClient) {}

  async getCurrentSession(): Promise<ActiveSession | null> {
    const { data } = await supabaseBrowserClient().auth.getSession();
    if (!data.session) return null;
    return this.resolveActiveSession();
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
    this.forgetWorkspace();
    await supabaseBrowserClient().auth.signOut();
  }

  private forgetWorkspace(): void {
    try {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      window.localStorage.removeItem(LEGACY_ORG_KEY);
    } catch {
      return;
    }
  }

  rememberWorkspace(key: string): void {
    try {
      window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, key);
    } catch {
      return;
    }
  }

  watchIdentity(onChange: (userId: string | null) => void): () => void {
    let active = true;
    const { data } = supabaseBrowserClient().auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "PASSWORD_RECOVERY") return;
      queueMicrotask(() => { if (active) onChange(session?.user.id ?? null); });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }

  async refresh(): Promise<ActiveSession> {
    return this.resolveActiveSession();
  }

  private async resolveActiveSession(): Promise<ActiveSession> {
    const me = MeDtoSchema.parse(await this.http.request<unknown>("/me"));
    const memberships: OrganizationMembership[] = me.organizations.map((o) => ({
      organizationId: o.id,
      role: o.role,
      organizationName: o.name,
      verified: o.verified,
    }));

    const agent: AgentSummary | null = me.agentProfile
      ? {
          id: me.agentProfile.id,
          displayName: me.agentProfile.displayName,
          headline: me.agentProfile.headline,
          photoUrl: me.agentProfile.photoUrl,
          verificationState: me.agentProfile.verificationState,
        }
      : null;
    const eligibleMemberships = memberships.filter(m => me.capabilities.some(c => c.organizationId === m.organizationId && c.capability === m.role));
    const eligibleAgent = agent?.verificationState !== "SUSPENDED" && me.capabilities.some(c => c.capability === "AGENT") ? agent : null;
    const workspaces = workspacesFor(eligibleMemberships, eligibleAgent);
    const active = chooseWorkspace(workspaces, rememberedWorkspace());

    return {
      user: { id: me.id, displayName: me.displayName, ...(me.email ? { email: me.email } : {}) },
      workspaces,
      activeWorkspaceKey: active?.key ?? null,
      memberships: eligibleMemberships,
      capabilities: me.capabilities,
      agent: eligibleAgent,
    };
  }
}
