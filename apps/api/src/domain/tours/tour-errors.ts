import { DomainError } from '@/domain/shared/domain-error.ts';

export class TourNotPublishableError extends DomainError {}
export class SceneNotFoundError extends DomainError {}
export class TourNotFoundError extends DomainError {}
