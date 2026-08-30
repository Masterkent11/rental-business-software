import type { DomainEvent } from '@/domain/shared/domain-event.ts';
import type { ApplicationState } from './application-state.ts';

export interface ApplicationSubmittedEvent extends DomainEvent {
  readonly eventName: 'ApplicationSubmitted';
  readonly applicationId: string;
  readonly applicantId: string;
  readonly resourceId: string;
}

export interface ApplicationDecidedEvent extends DomainEvent {
  readonly eventName: 'ApplicationDecided';
  readonly applicationId: string;
  readonly decision: ApplicationState;
  readonly deciderId: string;
}
