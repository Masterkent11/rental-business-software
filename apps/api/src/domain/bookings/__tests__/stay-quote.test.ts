import { describe, expect, it } from 'vitest';
import {
  GuestLimitExceededError,
  StayTooLongError,
  StayTooShortError,
  bookingBucket,
  nextStayState,
  quoteStay,
} from '@/domain/bookings/booking.ts';
import { centavos } from '@/domain/shared/money.ts';

const pricing = {
  nightlyCentavos: centavos(150_000),
  cleaningFeeCentavos: centavos(40_000),
  minStayNights: 2,
  maxOccupants: 3,
};

describe('quoteStay', () => {
  it('prices nights plus the cleaning fee in integer centavos', () => {
    const quote = quoteStay(pricing, { startsOn: '2027-01-10', endsOn: '2027-01-13' }, 2);
    expect(quote.nights).toBe(3);
    expect(quote.lines.map((l) => l.code)).toEqual(['NIGHTS', 'CLEANING_FEE']);
    expect(quote.totalCentavos).toBe(150_000 * 3 + 40_000);
  });

  it('omits a zero cleaning fee', () => {
    const quote = quoteStay({ ...pricing, cleaningFeeCentavos: centavos(0) }, { startsOn: '2027-01-10', endsOn: '2027-01-12' }, 1);
    expect(quote.lines).toHaveLength(1);
  });

  it('enforces the minimum stay, the guest limit and the maximum length', () => {
    expect(() => quoteStay(pricing, { startsOn: '2027-01-10', endsOn: '2027-01-11' }, 1)).toThrow(StayTooShortError);
    expect(() => quoteStay(pricing, { startsOn: '2027-01-10', endsOn: '2027-01-12' }, 4)).toThrow(GuestLimitExceededError);
    expect(() => quoteStay(pricing, { startsOn: '2027-01-10', endsOn: '2027-01-12' }, 0)).toThrow(GuestLimitExceededError);
    expect(() => quoteStay(pricing, { startsOn: '2027-01-01', endsOn: '2027-06-01' }, 1)).toThrow(StayTooLongError);
  });
});

describe('stay lifecycle', () => {
  it('checks in only from the arrival date and completes only after check-in', () => {
    expect(() => nextStayState('CONFIRMED', 'CHECK_IN', '2027-01-10', '2027-01-09')).toThrow();
    expect(nextStayState('CONFIRMED', 'CHECK_IN', '2027-01-10', '2027-01-10')).toBe('IN_PROGRESS');
    expect(() => nextStayState('CONFIRMED', 'COMPLETE', '2027-01-10', '2027-01-12')).toThrow();
    expect(nextStayState('IN_PROGRESS', 'COMPLETE', '2027-01-10', '2027-01-12')).toBe('COMPLETED');
  });

  it('buckets bookings by what the guest needs to know', () => {
    const base = { occupancyState: 'COMMITTED', startsOn: '2027-01-10', endsOn: '2027-01-12' };
    expect(bookingBucket({ ...base, stayState: 'CONFIRMED', today: '2027-01-01' })).toBe('UPCOMING');
    expect(bookingBucket({ ...base, stayState: 'CONFIRMED', today: '2027-01-10' })).toBe('CURRENT');
    expect(bookingBucket({ ...base, stayState: 'CONFIRMED', today: '2027-01-12' })).toBe('PAST');
    expect(bookingBucket({ ...base, stayState: 'CANCELLED', today: '2027-01-01' })).toBe('CANCELLED');
    expect(bookingBucket({ ...base, occupancyState: 'HELD', stayState: null, today: '2027-01-01' })).toBe('PENDING_PAYMENT');
  });
});
