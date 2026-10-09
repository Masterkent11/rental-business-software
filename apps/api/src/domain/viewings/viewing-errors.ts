import { DomainError } from '@/domain/shared/domain-error.ts';

export class ViewingNotFoundError extends DomainError {}
export class InvalidViewingSlotError extends DomainError {}
export class ViewingSlotTakenError extends DomainError {}
export class InvalidViewingTransitionError extends DomainError {}
export class ViewingAlreadyRequestedError extends DomainError {}
