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

export class DuplicatePropertyError extends DomainError {
  constructor(readonly existingListingId: string) {
    super('This property is already listed. Ask to represent the existing listing instead of creating a duplicate.');
  }
}

export class ChangeProposalNotFoundError extends DomainError {}
