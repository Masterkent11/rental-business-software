import { describe, expect, it } from 'vitest';
import {
  InvalidViewingSlotError,
  InvalidViewingTransitionError,
  assertBookableSlot,
  nextViewingStatus,
  slotInstant,
  viewingDays,
} from '@/domain/viewings/viewing.ts';

const now = new Date('2026-10-08T01:00:00.000Z');

describe('viewing slots', () => {
  it('offers on-the-hour slots in Manila time and hides taken ones', () => {
    const tenAm = slotInstant('2026-10-10', 10);
    expect(tenAm.toISOString()).toBe('2026-10-10T02:00:00.000Z');
    const days = viewingDays(now, new Set([tenAm.getTime()]));
    const tenth = days.find((day) => day.date === '2026-10-10')!;
    expect(tenth.slots.find((slot) => slot.startsAt.getTime() === tenAm.getTime())!.available).toBe(false);
    expect(tenth.slots.filter((slot) => slot.available)).toHaveLength(6);
  });

  it('needs at least twelve hours notice', () => {
    const today = viewingDays(now, new Set()).find((day) => day.date === '2026-10-08');
    expect(today?.slots.every((slot) => !slot.available) ?? true).toBe(true);
  });

  it('rejects times that are not offered', () => {
    expect(() => assertBookableSlot(new Date('2026-10-10T02:30:00.000Z'), now)).toThrow(InvalidViewingSlotError);
    expect(() => assertBookableSlot(slotInstant('2026-10-10', 12), now)).toThrow(InvalidViewingSlotError);
    expect(() => assertBookableSlot(slotInstant('2026-10-08', 16), now)).toThrow(InvalidViewingSlotError);
    expect(() => assertBookableSlot(slotInstant('2026-12-30', 10), now)).toThrow(InvalidViewingSlotError);
    expect(() => assertBookableSlot(slotInstant('2026-10-10', 10), now)).not.toThrow();
  });
});

describe('viewing lifecycle', () => {
  const context = { now, scheduledAt: slotInstant('2026-10-10', 10) };

  it('the partner confirms a request and the customer can cancel', () => {
    expect(nextViewingStatus('REQUESTED', 'CONFIRM', 'AGENT', context)).toBe('CONFIRMED');
    expect(nextViewingStatus('CONFIRMED', 'CANCEL', 'CUSTOMER', context)).toBe('CANCELLED');
    expect(() => nextViewingStatus('REQUESTED', 'CONFIRM', 'CUSTOMER', context)).toThrow(InvalidViewingTransitionError);
  });

  it('a reschedule request sends the choice back to the customer', () => {
    expect(nextViewingStatus('CONFIRMED', 'REQUEST_RESCHEDULE', 'OWNER', context)).toBe('RESCHEDULE_REQUESTED');
    expect(nextViewingStatus('RESCHEDULE_REQUESTED', 'RESCHEDULE', 'CUSTOMER', context)).toBe('REQUESTED');
    expect(() => nextViewingStatus('REQUESTED', 'RESCHEDULE', 'AGENT', context)).toThrow(InvalidViewingTransitionError);
  });

  it('completion waits for the viewing to start, and finished viewings stay finished', () => {
    expect(() => nextViewingStatus('CONFIRMED', 'COMPLETE', 'AGENT', context)).toThrow(InvalidViewingTransitionError);
    const later = { now: new Date('2026-10-10T04:00:00.000Z'), scheduledAt: context.scheduledAt };
    expect(nextViewingStatus('CONFIRMED', 'COMPLETE', 'AGENT', later)).toBe('COMPLETED');
    expect(() => nextViewingStatus('COMPLETED', 'CANCEL', 'CUSTOMER', later)).toThrow(InvalidViewingTransitionError);
  });
});
