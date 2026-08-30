/**
 * Base Domain Event.
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventName: string;
  readonly aggregateId: string;
}
