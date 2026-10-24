import { InvalidTransitionError } from '@/domain/applications/application-errors.ts';
import { localDay } from '@/domain/shared/calendar.ts';

export function assertTenancyActivation(input: {
  applicationState: string;
  kind: string;
  state: string;
  expiresAt: Date | null;
  endsOn: string | null;
  now: Date;
}): void {
  if (input.applicationState !== 'APPROVED') {
    throw new InvalidTransitionError('Approve this application before confirming its tenancy.');
  }
  if (input.endsOn !== null && input.endsOn <= localDay(input.now)) {
    throw new InvalidTransitionError('This rental period has already ended.');
  }
  const committed = input.state === 'COMMITTED' && ['LEASE', 'RESERVATION'].includes(input.kind);
  const held = input.kind === 'LEASE' && input.state === 'HELD'
    && input.expiresAt !== null && input.expiresAt > input.now;
  if (!committed && !held) {
    throw new InvalidTransitionError('A live approved lease hold or credited reservation is required.');
  }
}
