import { hasCapability, type Principal } from "@/domain/identity/identity.ts";

export type AdministrationPermission =
  "PARTNER_MONITOR" | "AGENT_REVIEW" | "IDENTITY_REVIEW";
export interface AdministrativeAudit {
  readonly purpose: string;
  readonly requestId: string;
}
export interface AdministrativeContext extends AdministrativeAudit {
  readonly assuranceLevel: "aal2";
}
export function mayAdminister(principal: Principal): boolean {
  return (
    principal.organizationId === null &&
    principal.assuranceLevel === "aal2" &&
    hasCapability(principal, "PLATFORM_ADMIN")
  );
}
export function validAdministrativeAudit(audit: AdministrativeAudit): boolean {
  return (
    /^[A-Za-z0-9 .:/_]{3,100}$/.test(audit.purpose) &&
    /^[A-Za-z0-9:/_.-]{1,100}$/.test(audit.requestId)
  );
}
