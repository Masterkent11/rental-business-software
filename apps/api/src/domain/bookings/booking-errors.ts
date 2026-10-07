import { DomainError } from '@/domain/shared/domain-error.ts';

export class StayTooLongError extends DomainError {}
export class StayTooShortError extends DomainError {}
export class GuestLimitExceededError extends DomainError {}
export class BookingNotHeldError extends DomainError {}
export class InvalidStayTransitionError extends DomainError {}
