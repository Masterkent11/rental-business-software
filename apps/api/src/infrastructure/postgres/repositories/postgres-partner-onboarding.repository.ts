import type { PartnerOnboardingRepository } from "@/application/ports/repositories/partner-onboarding.port.ts";
import { OnboardingUnavailableError } from "@/domain/identity/partner-onboarding.ts";
import { withUser } from "@/infrastructure/postgres/db.ts";

export function postgresPartnerOnboardingRepository(): PartnerOnboardingRepository {
  return {
    async createOwnerWorkspace({ userId, workspaceName }) {
      return withUser(userId, async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${userId}, 103))`;
        const [profile] =
          await tx`select id from user_profiles where id = ${userId} and deactivated_at is null for update`;
        if (!profile)
          throw new OnboardingUnavailableError(
            "Your account is not available. Please contact support.",
          );
        const [opposite] = await tx`select id from agent_profiles where user_id=${userId}`;
        if (opposite) throw new OnboardingUnavailableError('An additional partner role requires explicit platform provisioning.');
        const [owned] = await tx<{ id: string }[]>`
          select o.id from organizations o join organization_members m on m.organization_id = o.id
          where m.user_id = ${userId} and m.role = 'OWNER' and m.revoked_at is null
          order by m.granted_at, o.id limit 1
        `;
        if (owned) return { organizationId: owned.id };
        const [previous] =
          await tx`select id from organizations where onboarding_user_id = ${userId}`;
        if (previous)
          throw new OnboardingUnavailableError(
            "Your previous workspace access has changed. Contact your workspace administrator.",
          );
        const [organization] = await tx<{ id: string }[]>`
          insert into organizations (legal_name, trading_name, onboarding_user_id)
          values (${workspaceName}, ${workspaceName}, ${userId}) returning id
        `;
        const organizationId = organization!.id;
        await tx`
          insert into organization_members (user_id, organization_id, role)
          values (${userId}, ${organizationId}, 'OWNER')
        `;
        await tx`
          insert into user_capabilities (user_id, capability, organization_id, source_type, source_id)
          values (${userId}, 'OWNER', ${organizationId}, 'MEMBERSHIP', ${organizationId})
        `;
        return { organizationId };
      });
    },
  };
}
