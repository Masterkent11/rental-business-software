import type postgres from 'postgres';
import type { AdministrationRepository } from "@/application/ports/repositories/administration-repository.port.ts";
import { withAdministration, withUser } from "@/infrastructure/postgres/db.ts";
export const postgresAdministrationRepository =
  (): AdministrationRepository => ({
    async permitted(userId, permission) {
      return withUser(userId, async (tx) => {
        const [row] = await tx<
          { allowed: boolean }[]
        >`select app_private.has_admin_permission(${permission}) as allowed`;
        return row?.allowed === true;
      });
    },
    async audit(userId, permission, targetId, outcome, audit) {
      const write = async (tx: postgres.TransactionSql) => {
        await tx`select app_private.record_platform_audit(${permission},${targetId}::uuid,${outcome},${audit.purpose},${audit.requestId})`;
      };
      if (outcome === "ALLOWED")
        await withAdministration(
          userId,
          { ...audit, assuranceLevel: "aal2" },
          write,
        );
      else await withUser(userId, write);
    },
    async monitor(userId, context) {
      return withAdministration(userId, context, async (tx) => {
        const rows = await tx<
          { kind: "OWNER" | "AGENT"; state: string; total: string }[]
        >`select * from app_private.monitor_partners(${context.purpose},${context.requestId})`;
        return rows.map((row) => ({ ...row, total: Number(row.total) }));
      });
    },
  });
