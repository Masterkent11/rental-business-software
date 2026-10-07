import { centavos, type Centavos } from '@/domain/shared/money.ts';
import { nightCount, type DateRange } from '@/domain/occupancy/occupancy.ts';
import { MAX_NIGHTS } from './booking-rules.ts';
import {
  GuestLimitExceededError,
  StayTooLongError,
  StayTooShortError,
} from './booking-errors.ts';

export interface StayPricing {
  readonly nightlyCentavos: Centavos;
  readonly cleaningFeeCentavos: Centavos;
  readonly minStayNights: number;
  readonly maxOccupants: number;
}

export interface StayQuoteLine {
  readonly code: 'NIGHTS' | 'CLEANING_FEE';
  readonly label: string;
  readonly centavos: Centavos;
}

export interface StayQuote {
  readonly nights: number;
  readonly guests: number;
  readonly nightlyCentavos: Centavos;
  readonly lines: readonly StayQuoteLine[];
  readonly totalCentavos: Centavos;
}

const peso = (value: number): string =>
  `₱${(value / 100).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

export function quoteStay(
  pricing: StayPricing,
  during: DateRange,
  guests: number,
): StayQuote {
  const nights = nightCount(during);

  if (nights > MAX_NIGHTS) {
    throw new StayTooLongError(
      `A stay may be at most ${MAX_NIGHTS} nights. Longer arrangements are leases.`,
    );
  }
  if (nights < Math.max(1, pricing.minStayNights)) {
    throw new StayTooShortError(
      `This place needs a stay of at least ${pricing.minStayNights} night${pricing.minStayNights === 1 ? '' : 's'}.`,
    );
  }
  if (!Number.isInteger(guests) || guests < 1) {
    throw new GuestLimitExceededError('At least one guest is required.');
  }
  if (guests > pricing.maxOccupants) {
    throw new GuestLimitExceededError(
      `This place sleeps at most ${pricing.maxOccupants} guest${pricing.maxOccupants === 1 ? '' : 's'}.`,
    );
  }

  const stay = centavos(pricing.nightlyCentavos * nights);
  const lines: StayQuoteLine[] = [
    {
      code: 'NIGHTS',
      label: `${peso(pricing.nightlyCentavos)} × ${nights} night${nights === 1 ? '' : 's'}`,
      centavos: stay,
    },
  ];
  if (pricing.cleaningFeeCentavos > 0) {
    lines.push({
      code: 'CLEANING_FEE',
      label: 'Cleaning fee',
      centavos: pricing.cleaningFeeCentavos,
    });
  }

  return {
    nights,
    guests,
    nightlyCentavos: pricing.nightlyCentavos,
    lines,
    totalCentavos: centavos(lines.reduce((sum, line) => sum + line.centavos, 0)),
  };
}
