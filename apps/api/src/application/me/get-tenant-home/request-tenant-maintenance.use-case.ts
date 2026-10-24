import type { getTenantHome } from './get-tenant-home.use-case.ts';
import type { startConversation } from '@/application/messaging/start-conversation/start-conversation.use-case.ts';
import type { sendCustomerMessage } from '@/application/messaging/send-message/send-message.use-case.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import { TenancyNotFoundError } from '@/domain/occupancy/tenant-home.ts';

export const requestTenantMaintenance = (
  home: ReturnType<typeof getTenantHome>, start: ReturnType<typeof startConversation>, send: ReturnType<typeof sendCustomerMessage>,
) => async (input: { principal: Principal; tenancyId: string; description: string; clientId: string }) => {
  const result = await home({ userId: input.principal.userId, tenancyId: input.tenancyId });
  const tenancy = result.tenancies[0]!;
  if (!tenancy.listingId) throw new TenancyNotFoundError('Contact support to reach your property manager.');
  const conversation = await start({ principal: input.principal, listingId: tenancy.listingId, bookingId: tenancy.id });
  const message = await send({ principal: input.principal, conversationId: conversation.id, body: `Maintenance request • ${tenancy.unit}\n${input.description}`, clientId: input.clientId });
  return { conversationId: conversation.id, messageId: message.id };
};
