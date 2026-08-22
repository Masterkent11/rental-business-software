import type { Centavos } from '../shared/money.ts';
import { centavos } from '../shared/money.ts';
import type { Listing } from './listing.ts';

/**
 * What it actually costs to get in the door.
 *
 * The customer journey is blunt about this: comparing bare monthly rent is
 * misleading in the Philippine market, where entry is typically three months up
 * front. An ₱8,500 unit costs ₱34,000 to move into, and the listing must say so
 * before anyone invests time in a viewing.
 *
 * **This is a money rule, so it lives in the domain.** Computing it in Flutter
 * or Next.js would put the same arithmetic in three places and let them drift —
 * and the number a customer budgets against is not something a client should be
 * inventing.
 *
 * The multipliers are per-listing data, not constants: 1 advance + 2 deposit is
 * the norm, not the law.
 */
export interface MoveInCostLine {
  readonly label: string;
  readonly centavos: Centavos;
}

export interface MoveInCost {
  readonly lines: readonly MoveInCostLine[];
  readonly totalCentavos: Centavos;
}

/** Null for short-term: a nightly stay is prepaid and has no deposit in V1. */
export function moveInCostFor(listing: Listing): MoveInCost | null {
  if (listing.kind !== 'LONG_TERM') return null;

  const rent = listing.priceCentavos;
  const lines: MoveInCostLine[] = [
    { label: 'First month rent', centavos: rent },
  ];

  if (listing.advanceMonths > 0) {
    lines.push({
      label: `Advance (${listing.advanceMonths} month${listing.advanceMonths === 1 ? '' : 's'})`,
      centavos: centavos(rent * listing.advanceMonths),
    });
  }

  if (listing.depositMonths > 0) {
    lines.push({
      label: `Deposit (${listing.depositMonths} month${listing.depositMonths === 1 ? '' : 's'})`,
      centavos: centavos(rent * listing.depositMonths),
    });
  }

  return {
    lines,
    totalCentavos: centavos(lines.reduce((sum, line) => sum + line.centavos, 0)),
  };
}
