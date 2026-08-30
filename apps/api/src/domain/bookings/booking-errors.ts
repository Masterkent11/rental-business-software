import { DomainError } from '@/domain/shared/domain-error.ts';

export class StayTooLongError extends DomainError {}
export class BookingNotHeldError extends DomainError {}
