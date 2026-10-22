import { describe, expect, it } from 'vitest';
import {
  InvalidDateRangeError,
  dateRange,
  isLive,
  nightCount,
  nightsIn,
  overlaps,
  type Occupancy,
} from '@/domain/occupancy/occupancy.ts';

describe('dateRange', () => {
  it.each(['2026-02-30', '2026-04-31', '2026-13-01'])('rejects an impossible start date %s', start => {
    expect(() => dateRange(start, '2027-01-01')).toThrow(InvalidDateRangeError);
  });

  it.each(['2026-02-30', '2026-04-31', '2026-13-01'])('rejects an impossible end date %s', end => {
    expect(() => dateRange('2026-01-01', end)).toThrow(InvalidDateRangeError);
  });

  it('refuses a zero-night stay rather than normalising it', () => {
    // Someone asking to check in and out on the same day has made a mistake.
    // Quietly booking nothing would hide it until they arrived.
    expect(() => dateRange('2026-12-01', '2026-12-01')).toThrow(
      InvalidDateRangeError,
    );
  });

  it('refuses a backwards range', () => {
    expect(() => dateRange('2026-12-05', '2026-12-01')).toThrow(
      InvalidDateRangeError,
    );
  });

  it('refuses a date that is not a date', () => {
    expect(() => dateRange('next tuesday', '2026-12-01')).toThrow(
      InvalidDateRangeError,
    );
  });
});

describe('nights', () => {
  it('counts nights, not days', () => {
    // Dec 1 → Dec 4 is three nights. Charging for four is the classic
    // off-by-one, and it is a billing error, not a display one.
    expect(nightCount(dateRange('2026-12-01', '2026-12-04'))).toBe(3);
  });

  it('lists every night and excludes the checkout day', () => {
    expect(nightsIn(dateRange('2026-12-01', '2026-12-04'))).toEqual([
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
    ]);
  });

  it('counts correctly across a month boundary', () => {
    expect(nightCount(dateRange('2026-11-29', '2026-12-02'))).toBe(3);
  });

  it('counts correctly across a leap day', () => {
    expect(nightCount(dateRange('2028-02-28', '2028-03-01'))).toBe(2);
  });
});

describe('overlaps', () => {
  it('lets a checkout and a check-in share a day', () => {
    // Half-open ranges throughout. This is the ordinary case, not an edge one.
    const leaving = dateRange('2026-12-01', '2026-12-10');
    const arriving = dateRange('2026-12-10', '2026-12-12');

    expect(overlaps(leaving, arriving)).toBe(false);
  });

  it('sees a one-night overlap', () => {
    expect(
      overlaps(
        dateRange('2026-12-01', '2026-12-10'),
        dateRange('2026-12-09', '2026-12-12'),
      ),
    ).toBe(true);
  });

  it('sees containment', () => {
    expect(
      overlaps(
        dateRange('2026-12-01', '2026-12-31'),
        dateRange('2026-12-10', '2026-12-12'),
      ),
    ).toBe(true);
  });
});

describe('isLive', () => {
  const base: Occupancy = {
    id: 'o-1',
    organizationId: 'org-1',
    resourceId: 'r-1',
    kind: 'BOOKING',
    state: 'HELD',
    during: dateRange('2026-12-01', '2026-12-04'),
    expiresAt: new Date('2026-12-01T10:00:00Z'),
  };

  const now = new Date('2026-12-01T09:00:00Z');

  it('counts an unexpired hold', () => {
    expect(isLive(base, now)).toBe(true);
  });

  it('stops counting an expired hold', () => {
    // An abandoned checkout must not keep the nights off the market.
    expect(isLive(base, new Date('2026-12-01T11:00:00Z'))).toBe(false);
  });

  it('counts a committed occupancy regardless of expiry', () => {
    expect(
      isLive({ ...base, state: 'COMMITTED', expiresAt: null }, now),
    ).toBe(true);
  });

  it('ignores cancelled and released occupancies', () => {
    for (const state of ['CANCELLED', 'RELEASED', 'EXPIRED'] as const) {
      expect(isLive({ ...base, state, expiresAt: null }, now)).toBe(false);
    }
  });
});
