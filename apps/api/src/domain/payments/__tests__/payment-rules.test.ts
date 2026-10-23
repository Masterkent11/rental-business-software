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

describe('stay amount precision', () => {
  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid night count %s', nights => {
    expect(() => stayTotalCentavos(centavos(100), nights)).toThrow();
  });
  it('rejects a total beyond exact integer precision', () => {
    expect(() => stayTotalCentavos(centavos(Number.MAX_SAFE_INTEGER), 2)).toThrow();
  });
});
