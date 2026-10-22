import { describe, expect, it } from 'vitest';
import { centavos } from '@/domain/shared/money.ts';

describe('exact money representation', () => {
  it('accepts zero and the largest exactly representable integer', () => {
    expect(centavos(0)).toBe(0);
    expect(centavos(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
  it.each([-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects inexact or negative money %s', (amount) => {
    expect(() => centavos(amount)).toThrow(RangeError);
  });
});
