import { withUserAndScope } from '@/infrastructure/postgres/db.ts';
import type { TenancyActivationRepository } from '@/application/ports/repositories/tenancy-activation-repository.port.ts';
import { ApplicationNotFoundError, NotApplicableError } from '@/application/ports/repositories/application-repository.port.ts';
import { assertTenancyActivation } from '@/domain/occupancy/tenancy-activation.ts';

export const postgresTenancyActivationRepository = (): TenancyActivationRepository => ({
  async confirm(input) {
    return withUserAndScope(input.confirmedBy, input.organizationId, async tx => {
      const [application] = await tx<{ state: string; applicant_id: string; resource_id: string }[]>`
        select state, applicant_id, resource_id from applications
        where id = ${input.applicationId} and organization_id = ${input.organizationId} for update
      `;
      if (!application) throw new ApplicationNotFoundError('Application not found.');
      const [occupancy] = await tx<{
        id: string; kind: string; state: string; expires_at: Date | null;
        starts_on: string | null; ends_on: string | null; activation_confirmed_at: Date | null;
      }[]>`
        select id, kind, state, expires_at, lower(during)::text as starts_on,
          upper(during)::text as ends_on, activation_confirmed_at
        from occupancies where application_id = ${input.applicationId}
          and organization_id = ${input.organizationId} and resource_id = ${application.resource_id}
          and held_by = ${application.applicant_id} and kind in ('LEASE', 'RESERVATION')
        order by (state = 'COMMITTED') desc, (state = 'HELD') desc, created_at desc, id
        limit 1 for update
      `;
      if (!occupancy) throw new NotApplicableError('No approved lease hold is available.');
      assertTenancyActivation({
        applicationState: application.state, kind: occupancy.kind, state: occupancy.state,
        expiresAt: occupancy.expires_at, endsOn: occupancy.ends_on, now: input.now,
      });
      if (!occupancy.activation_confirmed_at) {
        await tx`update occupancies set kind = 'LEASE', state = 'COMMITTED', expires_at = null,
          activation_confirmed_by = ${input.confirmedBy}, activation_confirmed_at = ${input.now}
          where id = ${occupancy.id} and organization_id = ${input.organizationId}`;
        await tx`select set_config('app.user_id', ${application.applicant_id}, true)`;
        await tx`insert into notifications(user_id, kind, title, body, link)
          values (${application.applicant_id}, 'APPLICATION_DECIDED', 'Your tenancy is confirmed',
            'Your property manager has confirmed your move-in requirements. My Home becomes available when your lease starts.', '/bookings')`;
      }
      return {
        id: occupancy.id, state: 'COMMITTED', startsOn: occupancy.starts_on, endsOn: occupancy.ends_on,
        confirmedAt: occupancy.activation_confirmed_at ?? input.now,
      };
    });
  },
});
