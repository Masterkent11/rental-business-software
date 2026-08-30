import type { DomainEvent } from '@/domain/shared/domain-event.ts';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: readonly DomainEvent[]): Promise<void>;
}
