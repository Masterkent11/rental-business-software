import { describe, expect, it } from 'vitest';
import {
  InvalidViewingSlotError,
  InvalidViewingTransitionError,
  assertConfirmableStart,
  assertPreferredSchedule,
  describePreferredSchedule,
  localDayOf,
  localInstant,
  nextViewingStatus,
  windowBounds,
} from '@/domain/viewings/viewing.ts';

const now = new Date('2026-10-10T02:00:00.000Z');

describe('preferred viewing windows', () => {
  it('windows are anchored to Manila time, not UTC', () => {
    const afternoon = windowBounds('2026-10-14', 'AFTERNOON');
    expect(afternoon.from.toISOString()).toBe('2026-10-14T04:00:00.000Z');
    expect(afternoon.to.toISOString()).toBe('2026-10-14T08:00:00.000Z');
    expect(localDayOf(new Date('2026-10-13T17:30:00.000Z'))).toBe('2026-10-14');
  });

  it('accepts future preferences and rejects past, malformed or too-distant ones', () => {
    expect(() => assertPreferredSchedule('2026-10-14', 'MORNING', now)).not.toThrow();
    expect(() => assertPreferredSchedule('2026-10-10', 'EVENING', now)).not.toThrow();
    expect(() => assertPreferredSchedule('2026-10-10', 'MORNING', now)).not.toThrow();
    expect(() => assertPreferredSchedule('2026-10-10', 'MORNING', new Date('2026-10-10T03:30:00.000Z'))).toThrow(
      InvalidViewingSlotError,
    );
    expect(() => assertPreferredSchedule('2026-10-09', 'EVENING', now)).toThrow(InvalidViewingSlotError);
    expect(() => assertPreferredSchedule('2026-02-30', 'MORNING', now)).toThrow(InvalidViewingSlotError);
    expect(() => assertPreferredSchedule('14-10-2026', 'MORNING', now)).toThrow(InvalidViewingSlotError);
    expect(() => assertPreferredSchedule('2026-12-30', 'MORNING', now)).toThrow(InvalidViewingSlotError);
  });

  it('describes the preference in plain words', () => {
    expect(describePreferredSchedule('2026-10-14', 'AFTERNOON')).toBe('Wednesday, October 14, afternoon (12:00 PM – 4:00 PM)');
  });

  it('confirmed times must be future, on a quarter hour and within viewing hours', () => {
    expect(() => assertConfirmableStart(localInstant('2026-10-14', 13, 30), now)).not.toThrow();
    expect(() => assertConfirmableStart(localInstant('2026-10-14', 13, 10), now)).toThrow(InvalidViewingSlotError);
    expect(() => assertConfirmableStart(localInstant('2026-10-14', 21, 0), now)).toThrow(InvalidViewingSlotError);
    expect(() => assertConfirmableStart(localInstant('2026-10-09', 13, 0), now)).toThrow(InvalidViewingSlotError);
  });
});

describe('viewing lifecycle', () => {
  const pending = { now, scheduledAt: null, hasAgent: true };
  const confirmed = { now, scheduledAt: localInstant('2026-10-14', 13), hasAgent: true };

  it('the assigned partner confirms a pending request and the customer can cancel', () => {
    expect(nextViewingStatus('REQUESTED', 'CONFIRM', 'AGENT', pending)).toBe('CONFIRMED');
    expect(nextViewingStatus('CONFIRMED', 'CANCEL', 'CUSTOMER', confirmed)).toBe('CANCELLED');
    expect(() => nextViewingStatus('REQUESTED', 'CONFIRM', 'CUSTOMER', pending)).toThrow(InvalidViewingTransitionError);
    expect(() => nextViewingStatus('MATCHING', 'CONFIRM', 'AGENT', pending)).toThrow(InvalidViewingTransitionError);
  });

  it('suggesting another time hands the choice back to the customer', () => {
    expect(nextViewingStatus('CONFIRMED', 'REQUEST_RESCHEDULE', 'OWNER', confirmed)).toBe('RESCHEDULE_REQUESTED');
    expect(nextViewingStatus('RESCHEDULE_REQUESTED', 'RESCHEDULE', 'CUSTOMER', confirmed)).toBe('REQUESTED');
    expect(nextViewingStatus('MATCHING', 'RESCHEDULE', 'CUSTOMER', { ...pending, hasAgent: false })).toBe('MATCHING');
    expect(() => nextViewingStatus('REQUESTED', 'RESCHEDULE', 'AGENT', pending)).toThrow(InvalidViewingTransitionError);
  });

  it('only the assigned agent can decline, which returns the request to matching', () => {
    expect(nextViewingStatus('REQUESTED', 'DECLINE', 'AGENT', pending)).toBe('MATCHING');
    expect(() => nextViewingStatus('REQUESTED', 'DECLINE', 'OWNER', pending)).toThrow(InvalidViewingTransitionError);
    expect(() => nextViewingStatus('REQUESTED', 'DECLINE', 'CUSTOMER', pending)).toThrow(InvalidViewingTransitionError);
  });

  it('completion waits for a confirmed viewing to start and finished viewings stay finished', () => {
    expect(() => nextViewingStatus('CONFIRMED', 'COMPLETE', 'AGENT', confirmed)).toThrow(InvalidViewingTransitionError);
    const later = { ...confirmed, now: new Date('2026-10-14T06:00:00.000Z') };
    expect(nextViewingStatus('CONFIRMED', 'COMPLETE', 'AGENT', later)).toBe('COMPLETED');
    expect(() => nextViewingStatus('COMPLETED', 'CANCEL', 'CUSTOMER', later)).toThrow(InvalidViewingTransitionError);
    expect(() => nextViewingStatus('DECLINED', 'RESCHEDULE', 'CUSTOMER', later)).toThrow(InvalidViewingTransitionError);
  });
});
