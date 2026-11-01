import type {
  AdministrativeAudit,
  AdministrativeContext,
  AdministrationPermission,
} from "@/domain/administration/administration.ts";
export interface PartnerCount {
  readonly kind: "OWNER" | "AGENT";
  readonly state: string;
  readonly total: number;
}
export interface AdministrationRepository {
  permitted(
    userId: string,
    permission: AdministrationPermission,
  ): Promise<boolean>;
  audit(
    userId: string,
    permission: AdministrationPermission,
    targetId: string | null,
    outcome: "ALLOWED" | "DENIED",
    audit: AdministrativeAudit,
  ): Promise<void>;
  monitor(
    userId: string,
    context: AdministrativeContext,
  ): Promise<readonly PartnerCount[]>;
}
