import { DomainError } from '@/domain/shared/domain-error.ts';

export class ListingNotFoundError extends DomainError {}
export class ListingNotPublishableError extends DomainError {}
