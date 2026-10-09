import { DomainError } from '@/domain/shared/domain-error.ts';

export class TourNotPublishableError extends DomainError {}
export class SceneNotFoundError extends DomainError {}
export class TourNotFoundError extends DomainError {}
export class InvalidTourProviderError extends DomainError {}
export class InvalidSceneViewError extends DomainError {}
export class SceneRemovalBlockedError extends DomainError {}
