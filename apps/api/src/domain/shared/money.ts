/**
 * Money, as the domain defines it.
 *
 * **Integer centavos, always** (P-06). No floating point touches an amount at
 * any layer, including JSON — a rate that arrives as 8500.00 and leaves as
 * 8499.999999 is the classic way rental software loses a peso a month and
 * nobody can explain where.
 *
 * Currency is PHP and the field exists anyway (D-02): there is no
 * multi-currency logic, and the tag is what stops a bare integer from being
 * ambiguous.
 */
export type Centavos = number & { readonly __brand: 'Centavos' };

export const centavos = (value: number): Centavos => {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Money must be whole centavos, received ${value}`);
  }
  if (value < 0) {
    // Direction is expressed by entry type, never by sign.
    throw new RangeError(`Money is never negative, received ${value}`);
  }
  return value as Centavos;
};

export const CURRENCY = 'PHP' as const;
