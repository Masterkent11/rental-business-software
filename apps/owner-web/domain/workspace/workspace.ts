import type { OrganizationMembership } from "../session/session";

export type AgentVerificationState = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

export interface AgentSummary {
  readonly id: string;
  readonly displayName: string;
  readonly headline: string;
  readonly photoUrl: string | null;
  readonly verificationState: AgentVerificationState;
}

export interface OwnerWorkspace {
  readonly kind: "OWNER";
  readonly key: string;
  readonly organizationId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly verified: boolean;
}

export interface AgentWorkspace {
  readonly kind: "AGENT";
  readonly key: "agent";
  readonly agentId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly verified: boolean;
}

export type Workspace = OwnerWorkspace | AgentWorkspace;

export type PartnerScope =
  | { readonly kind: "OWNER"; readonly organizationId: string }
  | { readonly kind: "AGENT"; readonly agentId: string };

export const ownerKey = (organizationId: string) => `owner:${organizationId}`;

export function workspacesFor(
  memberships: readonly OrganizationMembership[],
  agent: AgentSummary | null,
): Workspace[] {
  const owners: Workspace[] = memberships.map((m) => ({
    kind: "OWNER",
    key: ownerKey(m.organizationId),
    organizationId: m.organizationId,
    title: m.organizationName,
    subtitle: m.role === "STAFF" ? "Staff workspace" : "Owner workspace",
    verified: m.verified,
  }));
  if (!agent) return owners;
  return [
    ...owners,
    {
      kind: "AGENT",
      key: "agent",
      agentId: agent.id,
      title: agent.displayName,
      subtitle: agent.verificationState === "VERIFIED" ? "Agent workspace" : "Agent workspace · not verified",
      verified: agent.verificationState === "VERIFIED",
    },
  ];
}

export function chooseWorkspace(workspaces: readonly Workspace[], rememberedKey: string | null): Workspace | null {
  if (workspaces.length === 0) return null;
  if (workspaces.length === 1) return workspaces[0]!;
  return workspaces.find((w) => w.key === rememberedKey) ?? null;
}

export function scopeOf(workspace: Workspace): PartnerScope {
  return workspace.kind === "AGENT"
    ? { kind: "AGENT", agentId: workspace.agentId }
    : { kind: "OWNER", organizationId: workspace.organizationId };
}

export const workspaceHome = (workspace: Workspace): string => (workspace.kind === "AGENT" ? "/agent" : "/");

const SHARED_PATHS = ["/account"];

export function pathBelongsTo(pathname: string, workspace: Workspace): boolean {
  if (SHARED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  const agentPath = pathname === "/agent" || pathname.startsWith("/agent/");
  return workspace.kind === "AGENT" ? agentPath : !agentPath;
}
