import type {
  AnalyticsRepository,
  PartnerAnalytics,
} from '@/application/ports/repositories/analytics-repository.port.ts';
import type { Clock } from '@/application/ports/providers/clock.port.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { assertMayManageOrganization } from '@/application/identity/application-authorization.rules.ts';

const WEEKS = 12;

const sinceFor = (clock: Clock) => new Date(clock.now().getTime() - WEEKS * 7 * 24 * 60 * 60 * 1000);

export const getOrganizationAnalytics =
  (analytics: AnalyticsRepository, clock: Clock) =>
  async (input: { readonly principal: Principal; readonly organizationId: string }): Promise<PartnerAnalytics> => {
    assertMayManageOrganization(input.principal, input.organizationId);
    return analytics.forOrganization(input.organizationId, sinceFor(clock));
  };

export const getAgentAnalytics =
  (analytics: AnalyticsRepository, clock: Clock) =>
  async (input: { readonly principal: Principal }): Promise<PartnerAnalytics> =>
    analytics.forAgent(input.principal.userId, sinceFor(clock));
