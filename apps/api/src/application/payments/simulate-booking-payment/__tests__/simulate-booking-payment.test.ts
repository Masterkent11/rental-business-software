import { describe, expect, it, vi } from 'vitest';
import {
  PaymentNotOwnedError,
  SimulationUnavailableError,
  simulateBookingPayment,
} from '@/application/payments/simulate-booking-payment/simulate-booking-payment.use-case.ts';
import {
  BookingNotHeldError,
  type PaymentRepository,
} from '@/application/ports/repositories/payment-repository.port.ts';
import type { PaymentGateway } from '@/application/ports/providers/payment-gateway.port.ts';
import type { Centavos } from '@/domain/shared/money.ts';

describe('simulateBookingPayment', () => {
  const pendingPayment = {
    paymentId: 'p-1',
    occupancyId: 'occ-1',
    providerRef: 'sbx_123',
    amountCentavos: 150000 as Centavos,
    heldBy: 'user-alice',
  };

  const fakeRepo = {
    findPendingPayment: vi.fn().mockImplementation(async ({ paymentId, occupancyId }) => {
      if (paymentId === 'p-1' && occupancyId === 'occ-1') {
        return pendingPayment;
      }
      return null;
    }),
  } as unknown as PaymentRepository;

  const fakeGateway: PaymentGateway = {
    provider: 'SANDBOX',
    startPayment: vi.fn(),
    verifyWebhook: vi.fn(),
    refund: vi.fn(),
    simulateSuccess: vi.fn().mockReturnValue({
      rawBody: '{"status":"succeeded"}',
      signature: 'valid-sig',
    }),
  };

  const fakeConfirm = vi.fn().mockResolvedValue({
    applied: true,
    stayId: 'stay-1',
  });

  it('delegates to confirm when payment belongs to caller and hold exists', async () => {
    const simulate = simulateBookingPayment(fakeRepo, fakeGateway, fakeConfirm);
    const result = await simulate({
      occupancyId: 'occ-1',
      paymentId: 'p-1',
      userId: 'user-alice',
    });

    expect(result).toEqual({ applied: true, stayId: 'stay-1' });
    expect(fakeGateway.simulateSuccess).toHaveBeenCalledWith({
      providerRef: 'sbx_123',
      amountCentavos: 150000,
    });
    expect(fakeConfirm).toHaveBeenCalledWith({
      rawBody: '{"status":"succeeded"}',
      signature: 'valid-sig',
    });
  });

  it('throws BookingNotHeldError if payment is not found', async () => {
    const simulate = simulateBookingPayment(fakeRepo, fakeGateway, fakeConfirm);
    await expect(
      simulate({
        occupancyId: 'occ-unknown',
        paymentId: 'p-unknown',
        userId: 'user-alice',
      }),
    ).rejects.toThrow(BookingNotHeldError);
  });

  it('throws PaymentNotOwnedError if payment belongs to a different user', async () => {
    const simulate = simulateBookingPayment(fakeRepo, fakeGateway, fakeConfirm);
    await expect(
      simulate({
        occupancyId: 'occ-1',
        paymentId: 'p-1',
        userId: 'user-eve',
      }),
    ).rejects.toThrow(PaymentNotOwnedError);
  });

  it('throws SimulationUnavailableError if gateway does not support simulation', async () => {
    const gatewayWithoutSim: PaymentGateway = {
      provider: 'STRIPE',
      startPayment: vi.fn(),
      verifyWebhook: vi.fn(),
      refund: vi.fn(),
    };
    const simulate = simulateBookingPayment(fakeRepo, gatewayWithoutSim, fakeConfirm);
    await expect(
      simulate({
        occupancyId: 'occ-1',
        paymentId: 'p-1',
        userId: 'user-alice',
      }),
    ).rejects.toThrow(SimulationUnavailableError);
  });
});
