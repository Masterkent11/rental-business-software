import type { ViewingAction, ViewingActor, ViewingDay, ViewingStatus } from './viewing.ts';
import { InvalidViewingSlotError, InvalidViewingTransitionError } from './viewing-errors.ts';

export const VIEWING_UTC_OFFSET_MINUTES = 8 * 60;
export const VIEWING_HOURS: readonly number[] = [9, 10, 11, 13, 14, 15, 16];
export const VIEWING_DAYS_AHEAD = 21;
export const VIEWING_MIN_LEAD_MINUTES = 12 * 60;
export const VIEWING_DURATION_MINUTES = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
const offsetMs = VIEWING_UTC_OFFSET_MINUTES * 60 * 1000;

const localMidnight = (instant: Date): number => {
  const local = instant.getTime() + offsetMs;
  return local - (local % DAY_MS) - offsetMs;
};

const isoLocalDay = (midnightUtcMs: number): string => new Date(midnightUtcMs + offsetMs).toISOString().slice(0, 10);

export function slotInstant(day: string, hour: number): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hour, 0, 0) - offsetMs);
}

export function viewingDays(now: Date, taken: ReadonlySet<number>, days = VIEWING_DAYS_AHEAD): ViewingDay[] {
  const start = localMidnight(now);
  const out: ViewingDay[] = [];
  for (let i = 0; i <= days; i += 1) {
    const midnight = start + i * DAY_MS;
    const date = isoLocalDay(midnight);
    const slots = VIEWING_HOURS.map((hour) => {
      const startsAt = new Date(midnight + hour * 60 * 60 * 1000);
      const leadOk = startsAt.getTime() - now.getTime() >= VIEWING_MIN_LEAD_MINUTES * 60 * 1000;
      return { startsAt, available: leadOk && !taken.has(startsAt.getTime()) };
    }).filter((slot) => slot.startsAt.getTime() > now.getTime());
    if (slots.length > 0) out.push({ date, slots });
  }
  return out;
}

export function assertBookableSlot(startsAt: Date, now: Date): void {
  if (Number.isNaN(startsAt.getTime())) throw new InvalidViewingSlotError('Choose a viewing time');
  const local = new Date(startsAt.getTime() + offsetMs);
  const hour = local.getUTCHours();
  if (local.getUTCMinutes() !== 0 || local.getUTCSeconds() !== 0 || local.getUTCMilliseconds() !== 0) {
    throw new InvalidViewingSlotError('Viewings start on the hour');
  }
  if (!VIEWING_HOURS.includes(hour)) {
    throw new InvalidViewingSlotError('Choose one of the available viewing times');
  }
  const lead = startsAt.getTime() - now.getTime();
  if (lead < VIEWING_MIN_LEAD_MINUTES * 60 * 1000) {
    throw new InvalidViewingSlotError('Choose a time at least 12 hours from now');
  }
  if (lead > (VIEWING_DAYS_AHEAD + 1) * DAY_MS) {
    throw new InvalidViewingSlotError(`Viewings can be booked up to ${VIEWING_DAYS_AHEAD} days ahead`);
  }
}

export function normaliseViewingNote(raw: string | null | undefined): string {
  const note = (raw ?? '').trim();
  if (note.length > 1000) throw new InvalidViewingSlotError('Keep the note under 1,000 characters');
  return note;
}

const TERMINAL: readonly ViewingStatus[] = ['COMPLETED', 'CANCELLED'];

export function nextViewingStatus(
  current: ViewingStatus,
  action: ViewingAction,
  actor: ViewingActor,
  context: { readonly now: Date; readonly scheduledAt: Date },
): ViewingStatus {
  if (TERMINAL.includes(current)) {
    throw new InvalidViewingTransitionError(`This viewing is already ${current.toLowerCase()}`);
  }
  const partner = actor === 'OWNER' || actor === 'AGENT';
  switch (action) {
    case 'CONFIRM':
      if (!partner) throw new InvalidViewingTransitionError('Only the agent or owner can confirm a viewing');
      if (current !== 'REQUESTED') throw new InvalidViewingTransitionError('Only a requested viewing can be confirmed');
      if (context.scheduledAt.getTime() <= context.now.getTime()) {
        throw new InvalidViewingTransitionError('This viewing time has already passed');
      }
      return 'CONFIRMED';
    case 'REQUEST_RESCHEDULE':
      if (!partner) throw new InvalidViewingTransitionError('Only the agent or owner can ask for a new time');
      if (current === 'RESCHEDULE_REQUESTED') {
        throw new InvalidViewingTransitionError('A new time has already been requested');
      }
      return 'RESCHEDULE_REQUESTED';
    case 'RESCHEDULE':
      if (partner) throw new InvalidViewingTransitionError('The customer picks the new time');
      return 'REQUESTED';
    case 'CANCEL':
      return 'CANCELLED';
    case 'COMPLETE':
      if (!partner) throw new InvalidViewingTransitionError('Only the agent or owner can complete a viewing');
      if (current !== 'CONFIRMED') throw new InvalidViewingTransitionError('Only a confirmed viewing can be completed');
      if (context.scheduledAt.getTime() > context.now.getTime()) {
        throw new InvalidViewingTransitionError('A viewing can be completed once it has started');
      }
      return 'COMPLETED';
  }
}

export function formatViewingTime(startsAt: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(startsAt);
}
