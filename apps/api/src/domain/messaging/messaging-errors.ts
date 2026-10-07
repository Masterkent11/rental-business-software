import { DomainError } from '@/domain/shared/domain-error.ts';

export class ConversationNotFoundError extends DomainError {}
export class InvalidMessageError extends DomainError {}
export class ConversationNotAllowedError extends DomainError {}
