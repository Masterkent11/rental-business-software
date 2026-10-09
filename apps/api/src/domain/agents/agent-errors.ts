import { DomainError } from '@/domain/shared/domain-error.ts';

export class AgentProfileNotFoundError extends DomainError {}
export class InvalidAgentProfileError extends DomainError {}
export class AgentProfileExistsError extends DomainError {}
export class AgentNotAssignableError extends DomainError {}
export class InvalidVerificationRequestError extends DomainError {}
export class RepresentationNotFoundError extends DomainError {}
export class InvalidRepresentationTransitionError extends DomainError {}
export class RepresentationForbiddenError extends DomainError {}
export class ListingAlreadyRepresentedError extends DomainError {}
