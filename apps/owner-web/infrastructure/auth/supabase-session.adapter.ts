/**
 * Infrastructure Adapter: SupabaseSessionAdapter
 *
 * Implements SessionPort.
 * Encapsulates Supabase Auth SDK and coordinates with the API `/me` endpoint
 * to resolve dynamic user identity, organization memberships, and capabilities.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SessionPort } from "../../application/ports/session.port";
import type { ActiveSession, OrganizationMembership } from "../../domain/session/session";
import { env } from "../config/env";

export class SupabaseSessionAdapter implements SessionPort {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(env.supabaseUrl, env.supabasePublishableKey);
  }

  async getCurrentSession(): Promise<ActiveSession | null> {
    const {
      data: { session },
    } = await this.client.auth.getSession();

    if (!session || !session.user) {
      return null;
    }

    return this.resolveActiveSession(session.access_token);
  }

  async signIn(email: string, password: string): Promise<ActiveSession> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? "Authentication failed");
    }

    return this.resolveActiveSession(data.session.access_token);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  private async resolveActiveSession(accessToken: string): Promise<ActiveSession> {
    const response = await fetch(`${env.apiBaseUrl}/me`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to resolve tenant context (HTTP ${response.status})`);
    }

    const me = (await response.json()) as {
      id: string;
      displayName: string;
      email?: string;
      capabilities: { capability: string; organizationId: string | null }[];
    };

    const memberships: OrganizationMembership[] = me.capabilities
      .filter((c) => (c.capability === "OWNER" || c.capability === "STAFF") && c.organizationId)
      .map((c) => ({
        organizationId: c.organizationId!,
        role: (c.capability as "OWNER" | "STAFF"),
        organizationName: "Owner Workspace",
      }));

    const activeOrganizationId = memberships[0]?.organizationId;
    if (!activeOrganizationId) {
      throw new Error("No active organization membership found for this owner account.");
    }

    return {
      user: {
        id: me.id,
        displayName: me.displayName,
        email: me.email,
      },
      activeOrganizationId,
      memberships,
      capabilities: me.capabilities,
    };
  }
}
