import type { PreferredTimeWindow } from '@/domain/assignment/lead-assignment.ts';
import type { ViewingAction, ViewingActor, ViewingStatus } from './viewing.ts';
import { InvalidViewingSlotError, InvalidViewingTransitionError } from './viewing-errors.ts';

export const VIEWING_TIME_ZONE = 'Asia/Manila';
export const VIEWING_UTC_OFFSET_MINUTES = 8 * 60;
export const VIEWING_DURATION_MINUTES = 60;
export const VIEWING_PREFERENCE_DAYS_AHEAD = 30;
export const VIEWING_PREFERENCE_MIN_LEAD_MINUTES = 60;
export const VIEWING_CONFIRMATION_STEP_MINUTES = 15;

export const VIEWING_TIME_WINDOWS: Readonly<Record<PreferredTimeWindow, { readonly startHour: number; readonly endHour: number }>> = {
  MORNING: { startHour: 8, endHour: 12 },
  AFTERNOON: { startHour: 12, endHour: 16 },
  EVENING: { startHour: 16, endHour: 20 },
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const offsetMs = VIEWING_UTC_OFFSET_MINUTES * MINUTE_MS;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/u;

export function localDayOf(instant: Date): string {
  return new Date(instant.getTime() + offsetMs).toISOString().slice(0, 10);
}

export function localInstant(day: string, hour: number, minute = 0): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hour, minute, 0) - offsetMs);
}

export function windowBounds(day: string, window: PreferredTimeWindow): { readonly from: Date; readonly to: Date } {
  const hours = VIEWING_TIME_WINDOWS[window];
  return { from: localInstant(day, hours.startHour), to: localInstant(day, hours.endHour) };
}

export function assertPreferredSchedule(day: string, window: PreferredTimeWindow, now: Date): void {
  if (!ISO_DAY.test(day) || Number.isNaN(localInstant(day, 0).getTime()) || localDayOf(localInstant(day, 12)) !== day) {
    throw new InvalidViewingSlotError('Choose a valid date');
  }
  if (!(window in VIEWING_TIME_WINDOWS)) throw new InvalidViewingSlotError('Choose a preferred time');
  const { to } = windowBounds(day, window);
  if (to.getTime() - now.getTime() < VIEWING_PREFERENCE_MIN_LEAD_MINUTES * MINUTE_MS) {
    throw new InvalidViewingSlotError('Choose a date and time that has not passed');
  }
  if (localInstant(day, 0).getTime() - localInstant(localDayOf(now), 0).getTime() > VIEWING_PREFERENCE_DAYS_AHEAD * DAY_MS) {
    throw new InvalidViewingSlotError(`Viewings can be requested up to ${VIEWING_PREFERENCE_DAYS_AHEAD} days ahead`);
  }
}

export function assertConfirmableStart(startsAt: Date, now: Date): void {
  if (Number.isNaN(startsAt.getTime())) throw new InvalidViewingSlotError('Choose the viewing time');
  if (startsAt.getTime() <= now.getTime()) throw new InvalidViewingSlotError('Choose a time that has not passed');
  const local = new Date(startsAt.getTime() + offsetMs);
  if (local.getUTCSeconds() !== 0 || local.getUTCMilliseconds() !== 0 || local.getUTCMinutes() % VIEWING_CONFIRMATION_STEP_MINUTES !== 0) {
    throw new InvalidViewingSlotError(`Viewing times start every ${VIEWING_CONFIRMATION_STEP_MINUTES} minutes`);
  }
  const earliest = VIEWING_TIME_WINDOWS.MORNING.startHour;
  const latest = VIEWING_TIME_WINDOWS.EVENING.endHour;
  if (local.getUTCHours() < earliest || local.getUTCHours() >= latest) {
    throw new InvalidViewingSlotError('Viewings happen between 8:00 AM and 8:00 PM');
  }
}

export function normaliseViewingNote(raw: string | null | undefined): string {
  const note = (raw ?? '').trim();
  if (note.length > 1000) throw new InvalidViewingSlotError('Keep the note under 1,000 characters');
  return note;
}

const TERMINAL: readonly ViewingStatus[] = ['COMPLETED', 'CANCELLED', 'DECLINED'];

export interface ViewingTransitionContext {
  readonly now: Date;
  readonly scheduledAt: Date | null;
  readonly hasAgent: boolean;
}

export function nextViewingStatus(
  current: ViewingStatus,
  action: ViewingAction,
  actor: ViewingActor,
  context: ViewingTransitionContext,
): ViewingStatus {
  if (TERMINAL.includes(current)) {
    throw new InvalidViewingTransitionError(`This viewing is already ${current.toLowerCase()}`);
  }
  const partner = actor === 'OWNER' || actor === 'AGENT';
  switch (action) {
    case 'CONFIRM':
      if (!partner) throw new InvalidViewingTransitionError('Only the agent or owner can confirm a viewing');
      if (current !== 'REQUESTED') throw new InvalidViewingTransitionError('Only a pending request can be confirmed');
      return 'CONFIRMED';
    case 'REQUEST_RESCHEDULE':
      if (!partner) throw new InvalidViewingTransitionError('Only the agent or owner can suggest another time');
      if (current !== 'REQUESTED' && current !== 'CONFIRMED') {
        throw new InvalidViewingTransitionError('Another time has already been suggested');
      }
      return 'RESCHEDULE_REQUESTED';
    case 'DECLINE':
      if (actor !== 'AGENT') throw new InvalidViewingTransitionError('Only the assigned agent can decline');
      if (current === 'MATCHING') throw new InvalidViewingTransitionError('This request is not assigned to you');
      return 'MATCHING';
    case 'RESCHEDULE':
      if (partner) throw new InvalidViewingTransitionError('The customer picks the new time');
      return context.hasAgent ? 'REQUESTED' : 'MATCHING';
    case 'ACCEPT_SUGGESTION':
      if (partner) throw new InvalidViewingTransitionError('The customer accepts the suggested time');
      if (current !== 'RESCHEDULE_REQUESTED' || !context.scheduledAt || !context.hasAgent) {
        throw new InvalidViewingTransitionError('There is no suggested time to accept');
      }
      if (context.scheduledAt.getTime() <= context.now.getTime()) {
        throw new InvalidViewingTransitionError('The suggested time has already passed');
      }
      return 'CONFIRMED';
    case 'CANCEL':
      return 'CANCELLED';
    case 'COMPLETE':
      if (!partner) throw new InvalidViewingTransitionError('Only the agent or owner can complete a viewing');
      if (current !== 'CONFIRMED' || !context.scheduledAt) {
        throw new InvalidViewingTransitionError('Only a confirmed viewing can be completed');
      }
      if (context.scheduledAt.getTime() > context.now.getTime()) {
        throw new InvalidViewingTransitionError('A viewing can be completed once it has started');
      }
      return 'COMPLETED';
  }
}

export function describePreferredSchedule(day: string, window: PreferredTimeWindow): string {
  const date = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${day}T00:00:00Z`));
  const hours = VIEWING_TIME_WINDOWS[window];
  return `${date}, ${window.toLowerCase()} (${formatHour(hours.startHour)}  ${formatHour(hours.endHour)})`;
}

export function formatViewingTime(startsAt: Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: VIEWING_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(startsAt);
}

export function expectedViewingStart(schedule: {
  readonly scheduledAt: Date | null;
  readonly preferredDate: string | null;
  readonly preferredWindow: PreferredTimeWindow | null;
}): Date | null {
  if (schedule.scheduledAt) return schedule.scheduledAt;
  if (schedule.preferredDate && schedule.preferredWindow) {
    return windowBounds(schedule.preferredDate, schedule.preferredWindow).from;
  }
  return null;
}

export function describeViewingSchedule(schedule: {
  readonly scheduledAt: Date | null;
  readonly preferredDate: string | null;
  readonly preferredWindow: PreferredTimeWindow | null;
}): string {
  if (schedule.scheduledAt) return formatViewingTime(schedule.scheduledAt);
  if (schedule.preferredDate && schedule.preferredWindow) {
    return describePreferredSchedule(schedule.preferredDate, schedule.preferredWindow);
  }
  return 'Schedule to be arranged';
}

const formatHour = (hour: number): string => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
};
