import { describe, expect, it } from 'vitest';
import { stayTotalCentavos } from '@/domain/payments/payment.ts';
import { centavos } from '@/domain/shared/money.ts';

describe('stayTotalCentavos', () => {
  it('multiplies in integer centavos', () => {
    // ₱450/night × 3 = ₱1,350. Exact, and it must stay exact.
    expect(stayTotalCentavos(centavos(45_000), 3)).toBe(135_000);
  });

  it('never produces a fraction', () => {
    const total = stayTotalCentavos(centavos(33_333), 7);
    expect(Number.isInteger(total)).toBe(true);
  });

  it('refuses a zero-night stay', () => {
    expect(() => stayTotalCentavos(centavos(45_000), 0)).toThrow();
  });
});
