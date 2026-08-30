/**
 * Pure TypeScript Domain Entity: User Session & Tenant Context
 *
 * Rules:
 * - NO Zod
 * - NO React
 * - NO Supabase
 * - NO Zustand
 * - NO Infrastructure/HTTP imports
 */

export type OrganizationRole = "OWNER" | "STAFF";

export interface OrganizationMembership {
  readonly organizationId: string;
  readonly role: OrganizationRole;
  readonly organizationName?: string;
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
  readonly activeOrganizationId: string;
  readonly memberships: readonly OrganizationMembership[];
  readonly capabilities: readonly UserCapability[];
}
