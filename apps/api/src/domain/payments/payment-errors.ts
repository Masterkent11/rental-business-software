import { DomainError } from '@/domain/shared/domain-error.ts';

export class InvalidPaymentAmountError extends DomainError {}
export class PaymentNotPendingError extends DomainError {}
export class DuplicatePaymentError extends DomainError {}
