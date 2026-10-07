import { DomainError } from '@/domain/shared/domain-error.ts';

export class UnauthenticatedDomainError extends DomainError {}
export class OrganizationForbiddenDomainError extends DomainError {}

export class InvalidProfileError extends DomainError {}
