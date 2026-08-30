import { describe, expect, it } from 'vitest';
import { GetOwnerCollectionController } from '@/modules/collection/controllers/get-owner-collection.controller.ts';
import type { Principal } from '@/domain/identity/identity.ts';
import type { InvoiceRepository } from '@/application/ports/repositories/invoice-repository.port.ts';
import { getOwnerCollection } from '@/application/collection/get-owner-collection/get-owner-collection.use-case.ts';
import { OrganizationForbiddenError } from '@/application/identity/resolve-principal/resolve-principal.use-case.ts';
import type { GetOwnerCollectionInput } from '@/application/collection/get-owner-collection/get-owner-collection.types.ts';

const ORG = '11111111-1111-1111-1111-111111111111';

function controllerResolvingTo(principal: Principal, sawCollectionCall: () => void) {
  const fakeInvoices: InvoiceRepository = {
    outstandingFor: async () => [],
    collectionHistory: async () => [],
    recentPayments: async () => [],
    forTenant: async () => [],
    findById: async () => null,
    issue: async () => {
      throw new Error('not exercised');
    },
    applyPayment: async () => {
      throw new Error('not exercised');
    },
  };

  const collectionUseCase = getOwnerCollection(fakeInvoices);

  return new GetOwnerCollectionController(
    (async (input: GetOwnerCollectionInput) => {
      const result = await collectionUseCase(input);
      sawCollectionCall();
      return result;
    }) as never,
    (async () => principal) as never,
  );
}

describe('GetOwnerCollectionController authorization', () => {
  it('refuses a signed-in user with no OWNER or STAFF capability at this organization', async () => {
    let called = false;
    const principal: Principal = {
      userId: 'u-tenant',
      displayName: 'A Tenant',
      capabilities: [{ capability: 'TENANT', organizationId: null }],
      organizationId: null,
    };
    const controller = controllerResolvingTo(principal, () => (called = true));

    await expect(controller.forOwner(ORG)).rejects.toBeInstanceOf(OrganizationForbiddenError);
    expect(called).toBe(false);
  });

  it('refuses STAFF held at a different organization', async () => {
    let called = false;
    const principal: Principal = {
      userId: 'u-staff-elsewhere',
      displayName: 'Staff Elsewhere',
      capabilities: [{ capability: 'STAFF', organizationId: '99999999-9999-9999-9999-999999999999' }],
      organizationId: null,
    };
    const controller = controllerResolvingTo(principal, () => (called = true));

    await expect(controller.forOwner(ORG)).rejects.toBeInstanceOf(OrganizationForbiddenError);
    expect(called).toBe(false);
  });

  it('lets an OWNER of this organization through', async () => {
    let called = false;
    const principal: Principal = {
      userId: 'u-owner',
      displayName: 'The Owner',
      capabilities: [{ capability: 'OWNER', organizationId: ORG }],
      organizationId: ORG,
    };
    const controller = controllerResolvingTo(principal, () => (called = true));

    await controller.forOwner(ORG);
    expect(called).toBe(true);
  });
});
