import type { Centavos } from '../shared/money.ts';

/**
 * How the money arrived.
 *
 * The distinction is structural, not a flag: an online payment goes through the
 * gateway port, and an offline recording never touches it because there is
 * nothing to call — staff attest that cash changed hands (D-09, ADR-0008).
 * I-08 makes it immutable once set.
 */
export type PaymentOrigin = 'ONLINE' | 'OFFLINE_RECORDED';

export type PaymentState = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  readonly id: string;
  readonly organizationId: string;
  readonly occupancyId: string;
  readonly amountCentavos: Centavos;
  readonly origin: PaymentOrigin;
  readonly state: PaymentState;
  readonly providerRef: string | null;
  /** When the money arrived. */
  readonly receivedAt: Date | null;
  /** When the platform learned of it. The gap is what audit looks at. */
  readonly recordedAt: Date;
}

/**
 * What a stay costs, up front.
 *
 * Short-term is prepaid in full and raises no invoice — there is no claim to
 * settle later, so there is nothing for an invoice to be about.
 */
export function stayTotalCentavos(
  nightlyRateCentavos: Centavos,
  nights: number,
): Centavos {
  if (nights <= 0) {
    throw new Error('A stay must be at least one night');
  }
  // Integer arithmetic throughout. No floating point may touch an amount, at
  // any layer — a rate times a night count is exact, and must stay that way.
  return (nightlyRateCentavos * nights) as Centavos;
}
