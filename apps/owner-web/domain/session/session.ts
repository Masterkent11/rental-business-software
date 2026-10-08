import type { AgentSummary, Workspace } from "../workspace/workspace";

export type OrganizationRole = "OWNER" | "STAFF";

export interface OrganizationMembership {
  readonly organizationId: string;
  readonly role: OrganizationRole;
  readonly organizationName: string;
  readonly verified: boolean;
}

export interface UserCapability {
  readonly capability: string;
  readonly organizationId: string | null;
}

export interface UserProfile {
  readonly id: string;
  readonly displayName: string;
  readonly email?: string;
}

export interface ActiveSession {
  readonly user: UserProfile;
  readonly workspaces: readonly Workspace[];
  readonly activeWorkspaceKey: string | null;
  readonly memberships: readonly OrganizationMembership[];
  readonly capabilities: readonly UserCapability[];
  readonly agent: AgentSummary | null;
}
