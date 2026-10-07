import { DomainError } from '@/domain/shared/domain-error.ts';

export class ListingNotFoundError extends DomainError {}

export class ListingNotPublishableError extends DomainError {
  constructor(readonly problems: readonly string[]) {
    super(`This listing cannot be published yet: ${problems.join('; ')}`);
  }
}

export class InvalidListingTransitionError extends DomainError {}

export class InvalidListingDetailsError extends DomainError {}

export class ListingPhotoRejectedError extends DomainError {}
