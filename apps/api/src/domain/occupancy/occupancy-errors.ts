import { DomainError } from '@/domain/shared/domain-error.ts';

export class InvalidDateRangeError extends DomainError {}
export class OccupancyConflictError extends DomainError {}
