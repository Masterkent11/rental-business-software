import { DomainError } from '@/domain/shared/domain-error.ts';

export class InquiryNotFoundError extends DomainError {}
export class InvalidInquiryError extends DomainError {}
export class InvalidInquiryTransitionError extends DomainError {}
export class InquiryNotAllowedError extends DomainError {}
