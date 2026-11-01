import type postgres from "postgres";
export async function assertDatabaseIsolation(
  database: postgres.Sql,
): Promise<void> {
  const [role] = await database<{ unsafe: boolean; boundaries: boolean }[]>`
 select exists(select 1 from pg_roles r where pg_has_role(current_user,r.oid,'MEMBER') and (r.rolsuper or r.rolbypassrls))
 or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relkind in ('r','p') and pg_has_role(current_user,c.relowner,'MEMBER')) as unsafe,
 (to_regclass('app_private.partner_memberships') is not null and to_regclass('app_private.platform_permissions') is not null) as boundaries`;
  if (!role || role.unsafe)
    throw new Error(
      "API database role must not bypass RLS or own application tables",
    );
  if (process.env.TENANT_BOUNDARIES_ENABLED === "true" && !role.boundaries)
    throw new Error(
      "Tenant boundary migration is required before enabling tenant contexts",
    );
}
