import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TenantHomeController } from './tenant-home.controller.ts';
import { getTenantHome } from '@/application/me/get-tenant-home/get-tenant-home.use-case.ts';
import { UnauthenticatedError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import { TenancyNotFoundError } from '@/domain/occupancy/tenant-home.ts';

const id = 'ba000000-0000-4000-8000-000000000001';
function setup() {
  const list = vi.fn(async () => []);
  const maintenance = vi.fn(async () => ({ conversationId: 'conversation', messageId: 'message' }));
  const resolve = vi.fn(async (input: { authorization: string | undefined; organizationId: string | null }) => {
    if (input.authorization !== 'Bearer valid') throw new UnauthenticatedError('Sign in');
    return { userId: 'authenticated', displayName: 'Customer', capabilities: [], organizationId: null };
  });
  const home = getTenantHome({ listForCustomer: list, activityForCustomer: async () => ({ hasTrips: false, pendingApplications: 0, approvedApplications: 0 }) }, { now: () => new Date('2026-10-24T00:00:00Z') });
  return { controller: new TenantHomeController(resolve, home, maintenance), list, maintenance, resolve };
}

describe('TenantHomeController', () => {
  it('requires authentication before reading customer context', async () => {
    const { controller, list } = setup();
    await expect(controller.context()).rejects.toThrow(UnauthenticatedError);
    expect(list).not.toHaveBeenCalled();
  });
  it('takes the customer identity only from the resolved bearer principal', async () => {
    const { controller, list, resolve } = setup();
    const context = await controller.context('Bearer valid');
    expect(list).toHaveBeenCalledWith('authenticated');
    expect(resolve).toHaveBeenCalledWith({ authorization: 'Bearer valid', organizationId: null });
    expect(context.capabilities).toEqual(['EXPLORE', 'TRIPS', 'APPLICATION_TRACKING']);
    await expect(controller.details(id, 'Bearer valid')).rejects.toThrow(TenancyNotFoundError);
  });
  it('rejects invalid identifiers, empty descriptions and forged ownership fields', async () => {
    const { controller, maintenance } = setup();
    const body = { description: 'Please repair the kitchen tap.', clientId: id };
    await expect(controller.request('invalid', body, 'Bearer valid')).rejects.toThrow(BadRequestException);
    await expect(controller.request(id, { ...body, description: ' ' }, 'Bearer valid')).rejects.toThrow(BadRequestException);
    await expect(controller.request(id, { ...body, tenantId: 'someone' }, 'Bearer valid')).rejects.toThrow(BadRequestException);
    await expect(controller.request(id, body)).rejects.toThrow(UnauthenticatedError);
    expect(maintenance).not.toHaveBeenCalled();
    await controller.request(id, body, 'Bearer valid');
    expect(maintenance).toHaveBeenCalledWith({ ...body, tenancyId: id, principal: expect.objectContaining({ userId: 'authenticated' }) });
  });
});
