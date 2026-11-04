import type postgres from "postgres";
import type { PartnerShellRepository } from "@/application/ports/repositories/partner-shell-repository.port.ts";
import {
  PartnerUnavailableError,
  type PartnerContext,
  type PartnerSearchResult,
} from "@/domain/partners/partner-shell.ts";
import { withUserAndScope, escapeLike } from "@/infrastructure/postgres/db.ts";
const run = <T>(
  context: PartnerContext,
  work: (tx: postgres.TransactionSql) => Promise<T>,
) =>
  withUserAndScope(
    context.userId,
    context.kind === "OWNER" ? context.organizationId : null,
    work,
  );
const brandingError = (error: unknown): never => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "42P01"
  )
    throw new PartnerUnavailableError(
      "Workspace branding has not been enabled in this environment yet.",
    );
  throw error;
};
export function postgresPartnerShellRepository(): PartnerShellRepository {
  return {
    async search(context, query) {
      return run(context, async (tx) => {
        await tx`set local statement_timeout='2500ms'`;
        const owner = context.kind === "OWNER";
        const org = owner ? context.organizationId : null;
        const scope = owner
          ? tx`l.organization_id=${org}`
          : tx`app_private.agent_represents_listing(l.id)`;
        const inquiryScope = owner
          ? tx`i.organization_id=${org}`
          : tx`i.agent_id=app_private.current_app_agent()`;
        const candidates = tx`
 select l.id,'PROPERTY'::text as kind,l.title,p.area_label||', '||p.city_label as subtitle
 from listings l join rentable_resources r on r.id=l.resource_id join properties p on p.id=r.property_id
 where ${scope} and l.state<>'ARCHIVED'
 union all
 select i.id,'INQUIRY',coalesce(nullif(u.display_name,''),'Customer'),l.title||' · '||replace(lower(i.status),'_',' ')
 from inquiries i join listings l on l.id=i.listing_id left join user_profiles u on u.id=i.customer_id where ${inquiryScope}
 ${
   owner
     ? tx``
     : tx`union all
 select distinct u.id,'CLIENT',u.display_name,'Client'
 from inquiries i join user_profiles u on u.id=i.customer_id where i.agent_id=app_private.current_app_agent()
 union all
 select t.id,'TASK',t.title,case when t.done_at is null then 'Upcoming task' else 'Completed task' end
 from agent_tasks t where t.agent_id=app_private.current_app_agent() and t.done_at is null`
 }`;
        const fold = (value: ReturnType<typeof tx>) =>
          tx`lower(translate(${value},'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇáàâãäåéèêëíìîïóòôõöúùûüñç','AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc'))`;
        const search = fold(tx`title||' '||subtitle`),
          title = fold(tx`title`);
        const terms = query.split(" ");
        const condition = terms
          .map((term) => tx`${search} like ${"%" + escapeLike(term) + "%"}`)
          .reduce((a, b) => tx`${a} and ${b}`);
        return tx<
          PartnerSearchResult[]
        >`with candidates as (${candidates}) select id,kind,title,subtitle from candidates where ${condition}
 order by case when ${title}=${query} then 0 when ${title} like ${escapeLike(query) + "%"} then 1 when ${title} like ${"% " + escapeLike(query) + "%"} then 2 else 3 end, char_length(title),lower(title),kind,id limit 12`;
      });
    },
    async readLogo(context) {
      try {
        return await run(context, async (tx) => {
          const [row] = await tx<
            { logo: string }[]
          >`select logo from app_private.partner_branding where ${context.kind === "OWNER" ? tx`organization_id=${context.organizationId}` : tx`agent_id=app_private.current_app_agent()`}`;
          return row?.logo ?? null;
        });
      } catch (error) {
        return brandingError(error);
      }
    },
    async saveLogo(context, logo) {
      try {
        await run(context, async (tx) => {
          const predicate =
            context.kind === "OWNER"
              ? tx`organization_id=${context.organizationId}`
              : tx`agent_id=app_private.current_app_agent()`;
          if (logo === null) {
            await tx`delete from app_private.partner_branding where ${predicate}`;
            return;
          }
          if (context.kind === "OWNER")
            await tx`insert into app_private.partner_branding(organization_id,logo) values (${context.organizationId},${logo}) on conflict(organization_id) do update set logo=excluded.logo,updated_at=now()`;
          else
            await tx`insert into app_private.partner_branding(agent_id,logo) values (app_private.current_app_agent(),${logo}) on conflict(agent_id) do update set logo=excluded.logo,updated_at=now()`;
        });
      } catch (error) {
        brandingError(error);
      }
    },
  };
}
